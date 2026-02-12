import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const newPassword = "moodlr123";
  const hashed = await hash(newPassword, 10);

  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashed },
    });
    console.log(`Reset password for ${user.email} → "${newPassword}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
