import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = "marcelo@moodlr.com";
  const password = "moodlr123";

  console.log("Looking up user:", email);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.log("USER NOT FOUND!");
    return;
  }

  console.log("User found:", user.name, user.email);
  console.log("Password hash in DB:", user.passwordHash);

  const isValid = await compare(password, user.passwordHash);
  console.log(`compare("${password}", hash) =`, isValid);

  if (!isValid) {
    // Re-hash and update
    console.log("\nPassword doesn't match! Re-hashing...");
    const newHash = await hash(password, 10);
    console.log("New hash:", newHash);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });
    console.log("Updated! Verifying...");
    const user2 = await prisma.user.findUnique({ where: { email } });
    const isValid2 = await compare(password, user2!.passwordHash);
    console.log("Verification:", isValid2);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
