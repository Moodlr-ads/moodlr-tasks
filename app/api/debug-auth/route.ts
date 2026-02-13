import { NextResponse } from "next/server";
import { compare } from "bcrypt";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: "User not found",
        email,
      });
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    return NextResponse.json({
      success: isPasswordValid,
      email: user.email,
      name: user.name,
      hashInDb: user.passwordHash,
      passwordMatch: isPasswordValid,
      bcryptVersion: require("bcrypt/package.json").version,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
