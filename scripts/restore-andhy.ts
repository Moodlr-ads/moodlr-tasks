/**
 * Restore the admin user "Andhy" and re-associate tasks that lost him as assignee.
 *
 * Usage:  node scripts/restore-andhy.ts
 *
 * What it does:
 * - Ensures a user with email andhy@moodlr.com (name: Andhy) exists; recreates if missing.
 * - Updates every task whose assignee is currently NULL to be assigned to this user.
 *   (Assumes the only mass-null happened because the user was deleted with onDelete: SetNull.)
 *
 * It does NOT touch schema, migrations, or other tables.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ANDHY_EMAIL = "andhy@moodlr.com";
const ANDHY_NAME = "Andhy";

// Temporary password hash for "Andhy123!" (bcrypt 10 rounds).
// Admin can ask Andhy to reset password later.
const ANDHY_PASSWORD_HASH =
  "$2b$10$U1fr5dlR8RRPX1wdZvljFeOA4WzBt9mzSpjHNBrysoGoN7hYr1D7m";

async function main() {
  // Upsert user
  const user = await prisma.user.upsert({
    where: { email: ANDHY_EMAIL },
    update: {
      name: ANDHY_NAME,
      passwordHash: ANDHY_PASSWORD_HASH,
    },
    create: {
      email: ANDHY_EMAIL,
      name: ANDHY_NAME,
      passwordHash: ANDHY_PASSWORD_HASH,
    },
  });

  // Reassign tasks that lost assignee (were set NULL when user was deleted)
  const updated = await prisma.task.updateMany({
    where: { assigneeId: null },
    data: { assigneeId: user.id },
  });

  console.log(`User ensured: ${user.email} (${user.id})`);
  console.log(`Tasks reassigned to Andhy: ${updated.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
