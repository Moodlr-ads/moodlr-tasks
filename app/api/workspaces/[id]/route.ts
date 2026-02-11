import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

async function ensureWorkspaceOwner(id: string, userId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!workspace || workspace.ownerId !== userId) return null;
  return workspace;
}

export async function PUT(req: NextRequest, context: any) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!await ensureWorkspaceOwner(id, session.user.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { name, description, color, icon } = await req.json();

    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        name,
        description,
        color: color || undefined,
        icon: icon || undefined,
      },
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Error updating workspace:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: any) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!await ensureWorkspaceOwner(id, session.user.id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Gather board + task IDs for cascade delete
    const boards = await prisma.board.findMany({
      where: { workspaceId: id },
      select: { id: true },
    });
    const boardIds = boards.map((b) => b.id);

    if (boardIds.length) {
      const taskIds = (
        await prisma.task.findMany({
          where: { boardId: { in: boardIds } },
          select: { id: true },
        })
      ).map((t) => t.id);

      if (taskIds.length) {
        await prisma.taskAssignee.deleteMany({ where: { taskId: { in: taskIds } } });
      }
      await prisma.task.deleteMany({ where: { boardId: { in: boardIds } } });
      await prisma.status.deleteMany({ where: { boardId: { in: boardIds } } });
      await prisma.group.deleteMany({ where: { boardId: { in: boardIds } } });
      await prisma.board.deleteMany({ where: { id: { in: boardIds } } });
    }

    // Delete workspace tags
    await prisma.tag.deleteMany({ where: { workspaceId: id } });

    await prisma.workspace.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
