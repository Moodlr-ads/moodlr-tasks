import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { createNotifications } from "@/lib/notifications";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type TagPayload = string[] | undefined;
type AssigneePayload = string[] | undefined;

function parseDateInput(dateStr?: string | null) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;

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

async function validateTagIds(tagIds: TagPayload, workspaceId: string) {
  if (!tagIds || !tagIds.length) return [];
  const existing = await prisma.tag.findMany({
    where: { id: { in: tagIds }, workspaceId },
    select: { id: true },
  });
  return existing.map((t) => t.id);
}

async function validateAssigneeIds(assigneeIds: AssigneePayload) {
  if (!assigneeIds || !assigneeIds.length) return [];
  const existing = await prisma.user.findMany({
    where: { id: { in: assigneeIds } },
    select: { id: true },
  });
  return existing.map((u) => u.id);
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
    const assignees = searchParams.getAll("assignee_id");
    const tags = searchParams.getAll("tag_id");

    const filters: any[] = [];
    if (boardId) filters.push({ boardId });
    if (groupId) filters.push({ groupId });
    if (statusId) filters.push({ statusId });
    if (priority) filters.push({ priority });
    if (assignees.length) {
      filters.push({
        OR: [
          { assigneeId: { in: assignees } },
          { assignees: { some: { userId: { in: assignees } } } },
        ],
      });
    }
    if (tags.length) {
      filters.push({ tags: { some: { id: { in: tags } } } });
    }
    if (search) {
      filters.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const where = filters.length ? { AND: filters } : undefined;

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        tags: {
          where: { deletedAt: null },
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
      assigneeIds,
      tagIds,
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

    const boardInfo = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, workspaceId: true },
    });
    if (!boardInfo) {
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

    const sanitizedTagIds = await validateTagIds(tagIds, boardInfo.workspaceId);
    const requestedAssignees: string[] = Array.isArray(assigneeIds)
      ? assigneeIds
      : assigneeId
        ? [assigneeId]
        : [];
    const sanitizedAssignees = await validateAssigneeIds(
      Array.from(new Set(requestedAssignees)),
    );

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
        assigneeId:
          sanitizedAssignees[0] !== undefined ? sanitizedAssignees[0] : null,
        tags:
          sanitizedTagIds.length > 0
            ? {
                connect: sanitizedTagIds.map((id: string) => ({ id })),
              }
            : undefined,
        assignees:
          sanitizedAssignees.length > 0
            ? {
                create: sanitizedAssignees.map((id: string) => ({
                  user: { connect: { id } },
                })),
              }
            : undefined,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
        tags: true,
      },
    });

    // Notify assignees about new task
    if (sanitizedAssignees.length > 0) {
      createNotifications({
        userIds: sanitizedAssignees,
        excludeUserId: session.user.id,
        type: "task_created",
        title: "Nova task criada",
        message: task.title,
        taskId: task.id,
      }).catch(console.error);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
