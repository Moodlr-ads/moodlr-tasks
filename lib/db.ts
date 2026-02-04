import { PrismaClient } from '../prisma/generated/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function pickDatabaseUrl() {
  const base = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!base) return undefined;
  const url = new URL(base);
  // Prefer a low connection limit for local dev / Next dev server reloads
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', '3');
  }
  // Give more time before pool timeout
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '30');
  }
  // Ensure SSL
  if (!url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }
  return url.toString();
}

const runtimeDatabaseUrl = pickDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: runtimeDatabaseUrl ? { db: { url: runtimeDatabaseUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
