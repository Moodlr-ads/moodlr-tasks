// Seed script to reset users and insert fixed accounts.
// Run with: node scripts/seed-users.ts

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const users = [
  {
    email: "marcelo@moodlr.com",
    name: "Marcelo",
    passwordHash: "$2b$10$oCSvAQSqxy7txsYMqyTcIOyYD5uVsqOOysse2ZIv2A8OSfWdp4yxe",
  },
  {
    email: "vitor@moodlr.com",
    name: "Vitor",
    passwordHash: "$2b$10$8O7guTMmWlBNsshCPlRj3embIb9dYkwj3cCDwiUQxsPq0sNxQeOAq",
  },
  {
    email: "kayan@moodlr.com",
    name: "Kayan",
    passwordHash: "$2b$10$3x64HY.8lZxxMDgMyam08uBC7SQeSkpOijueyHESgisza8UhRlIvS",
  },
  {
    email: "gilailson@moodlr.com",
    name: "Gilailson",
    passwordHash: "$2b$10$cU7A/R1w/4g3cqrWXSPWMurgpPam94JmbgiihjA7/nIVzKoh.a71e",
  },
];

async function main() {
  console.log("Clearing users table...");
  await prisma.user.deleteMany({});

  console.log("Inserting fixed users...");
  await prisma.user.createMany({
    data: users,
  });

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
