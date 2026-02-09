import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type TagPayload = string[] | undefined;
type AssigneePayload = string[] | undefined;

function toUtcMidday(dateStr?: string | null) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;
  // Midday UTC avoids timezone shifting one day back/forward when displayed locally
  return new Date(`${trimmed}T12:00:00Z`);
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    const updateData: any = {};
    if ("title" in data) updateData.title = data.title;
    if ("description" in data) updateData.description = data.description;
    if ("priority" in data) updateData.priority = data.priority;
    if ("order" in data) updateData.order = data.order;
    if ("groupId" in data) updateData.groupId = data.groupId;

    if ("startDate" in data) {
      updateData.startDate =
        "startDate" in data ? toUtcMidday(data.startDate) : undefined;
    }
    if ("dueDate" in data) {
      updateData.dueDate =
        "dueDate" in data ? toUtcMidday(data.dueDate) : undefined;
    }

    if (Array.isArray(data.tagIds)) {
      const taskBoard = await prisma.task.findUnique({
        where: { id },
        select: { board: { select: { workspaceId: true } } },
      });
      if (taskBoard) {
        const sanitizedTagIds = await validateTagIds(
          data.tagIds,
          taskBoard.board.workspaceId,
        );
        updateData.tags = {
          set: sanitizedTagIds.map((tagId: string) => ({ id: tagId })),
        };
      }
    }

    if ("statusId" in data) {
      if (data.statusId === null) {
        updateData.status = { disconnect: true };
      } else if (data.statusId) {
        updateData.status = { connect: { id: data.statusId } };
      }
    }

    if (Array.isArray(data.assigneeIds) || "assigneeId" in data) {
      const requestedAssignees = Array.isArray(data.assigneeIds)
        ? data.assigneeIds
        : data.assigneeId === null
          ? []
          : data.assigneeId
            ? [data.assigneeId]
            : [];
      const sanitizedAssignees = await validateAssigneeIds(
        Array.from(new Set(requestedAssignees)),
      );
      updateData.assigneeId = sanitizedAssignees[0] ?? null;
      updateData.assignees = {
        deleteMany: {},
        create: sanitizedAssignees.map((assigneeId: string) => ({
          user: { connect: { id: assigneeId } },
        })),
      };
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        assignees: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        tags: true,
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Task deleted" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
