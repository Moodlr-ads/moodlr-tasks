import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["query", "error", "warn"] });

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@"));
  console.log("Testing connection...");

  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    console.log("Raw query OK:", result);
  } catch (e) {
    console.error("Raw query FAILED:", e);
  }

  try {
    const count = await prisma.workspace.count();
    console.log("Workspace count:", count);
  } catch (e) {
    console.error("Workspace count FAILED:", e);
  }

  try {
    const user = await prisma.user.findFirst();
    console.log("First user:", user ? `${user.name} (${user.email})` : "none");
  } catch (e) {
    console.error("User query FAILED:", e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
