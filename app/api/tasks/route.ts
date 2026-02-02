import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function toUtcMidday(dateStr?: string | null) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;
  return new Date(`${trimmed}T12:00:00Z`);
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("board_id");
    const groupId = searchParams.get("group_id");
    const statusId = searchParams.get("status_id");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");

    const where: any = {};
    if (boardId) where.boardId = boardId;
    if (groupId) where.groupId = groupId;
    if (statusId) where.statusId = statusId;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        assignee: {
          // ✅ FIX: incluir image do assignee (resolve sumir no F5)
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
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

    const {
      boardId,
      groupId,
      title,
      description,
      statusId,
      priority,
      startDate,
      dueDate,
      order,
      assigneeId,
    } = await req.json();

    const existingMax = await prisma.task.aggregate({
      where: { boardId },
      _max: { order: true },
    });

    const nextOrder =
      typeof order === "number"
        ? order
        : typeof existingMax._max.order === "number"
          ? existingMax._max.order + 1
          : 0;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        boardId,
        groupId,
        statusId,
        priority: priority || "medium",
        startDate: toUtcMidday(startDate),
        dueDate: toUtcMidday(dueDate),
        order: nextOrder,
        assigneeId: assigneeId || null,
      },
      include: {
        assignee: {
          // ✅ FIX: incluir image do assignee (mantém consistente ao criar)
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
