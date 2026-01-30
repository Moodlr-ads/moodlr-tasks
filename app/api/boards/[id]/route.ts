import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

async function ensureBoardOwner(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { workspace: { select: { ownerId: true } } },
  });
  if (!board || board.workspace.ownerId !== userId) return null;
  return board;
}

export async function PUT(req: NextRequest, context: any) {
  try {
    const { params } = context;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, color, icon } = await req.json();
    const board = await ensureBoardOwner(params.id, session.user.id);
    if (!board) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.board.update({
      where: { id: params.id },
      data: {
        name,
        description: description ?? undefined,
        color: color ?? undefined,
        icon: icon ?? undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: any) {
  try {
    const { params } = context;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const board = await ensureBoardOwner(params.id, session.user.id);
    if (!board) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.task.deleteMany({ where: { boardId: params.id } });
    await prisma.status.deleteMany({ where: { boardId: params.id } });
    await prisma.group.deleteMany({ where: { boardId: params.id } });
    await prisma.board.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
