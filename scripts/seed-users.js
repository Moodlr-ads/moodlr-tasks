// Seed script to upsert fixed accounts with known passwords for local/dev use.
// Run with: node scripts/seed-users.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const defaultPassword = process.env.MOODLR_DEFAULT_PASSWORD || null;

const users = [
  {
    email: "marcelo@moodlr.com",
    name: "Marcelo",
    password: defaultPassword || "marcelorola221",
    image: null,
  },
  {
    email: "vitor@moodlr.com",
    name: "Vitor",
    password: defaultPassword || "vitorlopes223",
    image: null,
  },
  {
    email: "kayan@moodlr.com",
    name: "Kayan",
    password: defaultPassword || "kayanmoodlr226",
    image: null,
  },
  {
    email: "gilailson@moodlr.com",
    name: "Gilailson",
    password: defaultPassword || "gilacarneiro227",
    image: null,
  },
  {
    email: "andhy@moodlr.com",
    name: "Andhy",
    password: defaultPassword || "andhymoodlr229",
    image: null,
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
