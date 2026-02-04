import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    const tags = await prisma.tag.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, workspaceId } = await req.json();
    const trimmed = name?.trim();
    if (!workspaceId || !trimmed) {
      return NextResponse.json(
        { error: "name and workspaceId are required" },
        { status: 400 },
      );
    }

    // Se já existir, retorna a existente (idempotente)
    const existing = await prisma.tag.findFirst({
      where: {
        workspaceId,
        name: trimmed,
      },
    });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const tag = await prisma.tag.create({
      data: {
        name: trimmed,
        workspaceId,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      // Como fallback, tenta retornar a tag existente
      const { name, workspaceId } = await req.json().catch(() => ({}));
      if (name && workspaceId) {
        const found = await prisma.tag.findFirst({
          where: { workspaceId, name: name.trim() },
        });
        if (found) return NextResponse.json(found, { status: 200 });
      }
      return NextResponse.json(
        { error: "Tag already exists in this workspace" },
        { status: 400 },
      );
    }
    console.error("Error creating tag:", error);
    return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
    );
  }
}
