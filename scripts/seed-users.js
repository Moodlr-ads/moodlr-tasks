// Seed script to upsert fixed accounts with known passwords for local/dev use.
// Run with: node scripts/seed-users.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const users = [
  {
    email: "marcelo@moodlr.com",
    name: "Marcelo",
    password: "marcelorola221",
    image: "/uploads/af707c63-7c02-4b33-a93d-26cbbd4b8184.png",
  },
  {
    email: "vitor@moodlr.com",
    name: "Vitor",
    password: "vitorlopes223",
    image: "/uploads/27bf47e9-42ae-4488-8030-19f757db48be.png",
  },
  {
    email: "kayan@moodlr.com",
    name: "Kayan",
    password: "kayanmoodlr226",
    image: "/uploads/d2f9e463-4971-490e-ada5-57f478056db2.png",
  },
  {
    email: "gilailson@moodlr.com",
    name: "Gilailson",
    password: "gilacarneiro227",
    image: "/uploads/0491e765-b12e-496b-b0a8-180e24419969.png",
  },
  {
    email: "andhy@moodlr.com",
    name: "Andhy",
    password: "andhymoodlr229",
    image: "/uploads/00a841c3-2de4-4ca5-8b32-615f2eef62d0.png",
  },
];

async function main() {
  console.log("Upserting fixed users...");
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        image: user.image || null,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        image: user.image || null,
      },
    });
    console.log(`Ensured user ${record.email}`);
  }

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
