import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function parseDateInput(dateStr?: string | null) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;

  // Expect "yyyy-MM-dd" or ISO; fallback to Date parse
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/;
  const normalized = isoCandidate.test(trimmed)
    ? `${trimmed}T00:00:00Z`
    : trimmed;

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toUtcMidday(dateStr?: string | null) {
  const parsed = parseDateInput(dateStr);
  if (!parsed) return null;
  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  );
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

    if (!boardId || typeof boardId !== "string") {
      return NextResponse.json(
        { error: "boardId is required" },
        { status: 400 },
      );
    }
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 },
      );
    }

    const start = toUtcMidday(startDate);
    const due = toUtcMidday(dueDate);
    if (start && due && start.getTime() > due.getTime()) {
      return NextResponse.json(
        { error: "Due date cannot be before start date" },
        { status: 400 },
      );
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true },
    });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (statusId) {
      const statusExists = await prisma.status.findFirst({
        where: { id: statusId, boardId },
        select: { id: true },
      });
      if (!statusExists) {
        return NextResponse.json(
          { error: "Invalid status for this board" },
          { status: 400 },
        );
      }
    }

    if (groupId) {
      const groupExists = await prisma.group.findFirst({
        where: { id: groupId, boardId },
        select: { id: true },
      });
      if (!groupExists) {
        return NextResponse.json(
          { error: "Invalid group for this board" },
          { status: 400 },
        );
      }
    }

    if (assigneeId) {
      const userExists = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { id: true },
      });
      if (!userExists) {
        return NextResponse.json(
          { error: "Assignee not found" },
          { status: 400 },
        );
      }
    }

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
        startDate: start,
        dueDate: due,
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
