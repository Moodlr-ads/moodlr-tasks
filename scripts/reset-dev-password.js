/**
 * Reset dev users' passwords to a single shared value.
 *
 * Safe by default:
 * - Only affects the fixed Moodlr dev accounts (see TARGET_EMAILS).
 * - Requires an explicit password via env/flag and a `--yes` confirmation.
 *
 * Usage (PowerShell):
 *   $env:MOODLR_DEFAULT_PASSWORD="moodlr224"; node scripts/reset-dev-password.js --yes
 *
 * Optional:
 *   node scripts/reset-dev-password.js --password moodlr224 --yes
 */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const TARGET_EMAILS = [
  "marcelo@moodlr.com",
  "vitor@moodlr.com",
  "kayan@moodlr.com",
  "gilailson@moodlr.com",
  "andhy@moodlr.com",
];

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function deriveSupabaseProjectRef(url) {
  const username = url.username || "";
  const match = username.match(/^postgres\.([a-z0-9]+)$/i);
  return match ? match[1] : null;
}

function buildDatabaseUrlOverride() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return null;

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const portOverride = getArgValue("--port");
  if (portOverride) url.port = String(portOverride);

  if (hasFlag("--ssl")) {
    if (!url.searchParams.get("sslmode")) url.searchParams.set("sslmode", "require");
  }

  if (hasFlag("--use-direct")) {
    const projectRef = deriveSupabaseProjectRef(url);
    if (projectRef) {
      url.username = "postgres";
      url.host = `db.${projectRef}.supabase.co`;
      url.port = "5432";
      url.searchParams.delete("pgbouncer");
    }
  }

  return url.toString();
}

function getSafeDbTarget() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return "<DATABASE_URL not set>";
  try {
    const url = new URL(rawUrl);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return "<invalid DATABASE_URL>";
  }
}

async function main() {
  const databaseUrlOverride = buildDatabaseUrlOverride();
  const prisma = new PrismaClient(
    databaseUrlOverride
      ? { datasources: { db: { url: databaseUrlOverride } } }
      : undefined
  );

  const password = getArgValue("--password") || process.env.MOODLR_DEFAULT_PASSWORD;
  const confirmed = hasFlag("--yes");

  if (!password || !confirmed) {
    console.log("Reset dev users' passwords (fixed Moodlr accounts only).");
    console.log(`Target DB: ${getSafeDbTarget()}`);
    console.log(`Target emails: ${TARGET_EMAILS.join(", ")}`);
    console.log(
      `URL overrides: --port <n> (e.g. 6543), --use-direct (db.<ref>.supabase.co), --ssl (sslmode=require)`
    );
    console.log("");
    console.log("Required:");
    console.log('  - Set MOODLR_DEFAULT_PASSWORD or pass --password "<value>"');
    console.log("  - Pass --yes to confirm");
    console.log("");
    console.log("Example (PowerShell):");
    console.log('  $env:MOODLR_DEFAULT_PASSWORD="moodlr224"; node scripts/reset-dev-password.js --yes');
    console.log('  $env:MOODLR_DEFAULT_PASSWORD="moodlr224"; npm run reset:dev-password -- --yes');
    process.exit(password ? 2 : 1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await prisma.user.updateMany({
    where: { email: { in: TARGET_EMAILS } },
    data: { passwordHash },
  });

  console.log(`Updated ${result.count} user(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
