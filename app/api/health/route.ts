import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      dbUrlPgbouncer: process.env.DATABASE_URL?.includes("pgbouncer=true") ?? false,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: process.env.NEXTAUTH_URL ?? "NOT SET",
    },
  };

  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    checks.db = { connected: true, result };
  } catch (error: any) {
    checks.db = { connected: false, error: error.message };
  }

  try {
    const userCount = await prisma.user.count();
    checks.users = { count: userCount };
  } catch (error: any) {
    checks.users = { error: error.message };
  }

  return NextResponse.json(checks);
}
