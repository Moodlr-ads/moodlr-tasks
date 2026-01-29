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

    const boards = await prisma.board.findMany({
      where: workspaceId ? { workspaceId } : {},
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId, name, description, color, icon } = await req.json();

    // Create board with default statuses
    const board = await prisma.board.create({
      data: {
        name,
        description,
        color: color || "#6366f1",
        icon: icon || "📋",
        workspaceId,
        statuses: {
          create: [
            { name: "To Do", color: "#94a3b8", order: 0 },
            { name: "In Progress", color: "#3b82f6", order: 1 },
            { name: "Review", color: "#a855f7", order: 2 },
            { name: "Done", color: "#10b981", order: 3 },
          ],
        },
      },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
