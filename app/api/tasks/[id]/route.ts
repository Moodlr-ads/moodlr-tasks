import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { createNotifications } from "@/lib/notifications";
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
  const unique = Array.from(new Set(tagIds));
  const existing = await prisma.tag.findMany({
    where: { id: { in: unique }, workspaceId },
    select: { id: true },
  });
  return existing.map((t) => t.id);
}

async function validateAssigneeIds(assigneeIds: AssigneePayload) {
  if (!assigneeIds || !assigneeIds.length) return [];
  const unique = Array.from(new Set(assigneeIds));
  const existing = await prisma.user.findMany({
    where: { id: { in: unique } },
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
      updateData.startDate = toUtcMidday(data.startDate);
    }
    if ("dueDate" in data) {
      updateData.dueDate = toUtcMidday(data.dueDate);
    }

    if (Array.isArray(data.tagIds)) {
      const taskBoard = await prisma.task.findUnique({
        where: { id },
        select: { board: { select: { workspaceId: true } } },
      });
      if (!taskBoard?.board?.workspaceId) {
        return NextResponse.json(
          { error: "Task or workspace not found" },
          { status: 404 },
        );
      }
      const sanitizedTagIds = await validateTagIds(
        data.tagIds,
        taskBoard.board.workspaceId,
      );
      updateData.tags = {
        set: sanitizedTagIds.map((tagId: string) => ({ id: tagId })),
      };
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
      const sanitizedAssignees = await validateAssigneeIds(requestedAssignees);
      updateData.assignee =
        sanitizedAssignees[0] !== undefined
          ? { connect: { id: sanitizedAssignees[0] } }
          : { disconnect: true };
      const assigneeCreates = sanitizedAssignees.map((assigneeId: string) => ({
        user: { connect: { id: assigneeId } },
      }));
      updateData.assignees = {
        deleteMany: {},
        ...(assigneeCreates.length ? { create: assigneeCreates } : {}),
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
        tags: {
          where: { deletedAt: null },
        },
      },
    });

    // Determine notification type
    const notifType = "statusId" in data ? "task_status_changed" : "task_updated";
    const notifTitle = notifType === "task_status_changed"
      ? "Status alterado"
      : "Task atualizada";

    // Notify only assignees of this task
    const assigneeIds = task.assignees.map((a) => a.user.id);
    if (assigneeIds.length > 0) {
      createNotifications({
        userIds: assigneeIds,
        excludeUserId: session.user.id,
        type: notifType,
        title: notifTitle,
        message: task.title,
        taskId: task.id,
      }).catch(console.error);
    }

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

    // Get task info + assignees before deleting
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        title: true,
        assignees: { select: { userId: true } },
      },
    });

    await prisma.taskAssignee.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } });

    if (task) {
      const assigneeIds = task.assignees.map((a) => a.userId);
      if (assigneeIds.length > 0) {
        createNotifications({
          userIds: assigneeIds,
          excludeUserId: session.user.id,
          type: "task_deleted",
          title: "Task removida",
          message: task.title,
        }).catch(console.error);
      }
    }

    return NextResponse.json({ message: "Task deleted" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
