import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function PUT(req: NextRequest, context: any) {
  try {
    const { params } = context;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, color, icon } = await req.json();

    const workspace = await prisma.workspace.update({
      where: { id: params.id, ownerId: session.user.id },
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
    const { params } = context;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // gather boards to cascade delete related data
    const boards = await prisma.board.findMany({
      where: { workspaceId: params.id },
      select: { id: true },
    });
    const boardIds = boards.map((b) => b.id);

    if (boardIds.length) {
      await prisma.task.deleteMany({ where: { boardId: { in: boardIds } } });
      await prisma.status.deleteMany({ where: { boardId: { in: boardIds } } });
      await prisma.group.deleteMany({ where: { boardId: { in: boardIds } } });
      await prisma.board.deleteMany({ where: { id: { in: boardIds } } });
    }

    await prisma.workspace.delete({
      where: { id: params.id, ownerId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
