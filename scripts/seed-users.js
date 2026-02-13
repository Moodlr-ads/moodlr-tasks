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
    image: null,
  },
  {
    email: "vitor@moodlr.com",
    name: "Vitor",
    password: "vitorlopes223",
    image: null,
  },
  {
    email: "kayan@moodlr.com",
    name: "Kayan",
    password: "kayanmoodlr226",
    image: null,
  },
  {
    email: "gilailson@moodlr.com",
    name: "Gilailson",
    password: "gilacarneiro227",
    image: null,
  },
  {
    email: "andhy@moodlr.com",
    name: "Andhy",
    password: "andhymoodlr229",
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
