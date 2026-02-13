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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, color, icon } = await req.json();
    const board = await ensureBoardOwner(id, session.user.id);
    if (!board) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.board.update({
      where: { id },
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if board exists
    const board = await prisma.board.findUnique({ where: { id } });
    if (!board) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Disconnect many-to-many Tag relations before deleting tasks
    const tasks = await prisma.task.findMany({
      where: { boardId: id },
      select: { id: true },
    });

    if (tasks.length > 0) {
      // Disconnect all tags from tasks
      await Promise.all(
        tasks.map((task) =>
          prisma.task.update({
            where: { id: task.id },
            data: { tags: { set: [] } },
          })
        )
      );
    }

    // Now delete the board (cascade will handle the rest)
    await prisma.board.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
