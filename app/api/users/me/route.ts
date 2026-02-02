import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true },
    });

    return NextResponse.json(user, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { image, name, email } = await req.json();

    if (name !== undefined && (!name || typeof name !== "string")) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
    if (
      email !== undefined &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))
    ) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const normalizedImage =
      image === null
        ? null
        : typeof image === "string"
          ? image.trim() || null
          : undefined;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: normalizedImage,
        name: name ?? undefined,
        email: email ?? undefined,
      },
      select: { id: true, name: true, email: true, image: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
