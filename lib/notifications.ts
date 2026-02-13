import prisma from "@/lib/db";

type NotificationType =
  | "task_created"
  | "task_updated"
  | "task_status_changed"
  | "task_deleted"
  | "task_assigned";

export async function createNotifications({
  userIds,
  excludeUserId,
  type,
  title,
  message,
  taskId,
}: {
  userIds: string[];
  excludeUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
}) {
  const recipients = excludeUserId
    ? userIds.filter((id) => id !== excludeUserId)
    : userIds;

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type,
      title,
      message,
      taskId: taskId ?? null,
    })),
  });
}

export async function notifyAllUsers({
  excludeUserId,
  type,
  title,
  message,
  taskId,
}: {
  excludeUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
}) {
  const users = await prisma.user.findMany({ select: { id: true } });
  const userIds = users.map((u) => u.id);
  await createNotifications({ userIds, excludeUserId, type, title, message, taskId });
}
