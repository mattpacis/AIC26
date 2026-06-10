import { prisma } from '../lib/db.js';
import { type AuthContext, AppError } from '../lib/permissions.js';

function toPublicNotification(notification: {
  id: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    read: notification.read,
    link: notification.link,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function listNotifications(ctx: AuthContext) {
  const notifications = await prisma.notification.findMany({
    where: { userId: ctx.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = notifications.filter((item) => !item.read).length;

  return {
    notifications: notifications.map(toPublicNotification),
    unreadCount,
  };
}

export async function createNotification(
  userId: string,
  input: { title: string; body: string; link?: string },
) {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title || !body) {
    throw new AppError(400, 'Notification title and body are required');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      link: input.link?.trim() || null,
    },
  });

  return toPublicNotification(notification);
}

export async function markNotificationRead(
  ctx: AuthContext,
  notificationId: string,
) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId: ctx.userId },
  });

  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  const updated = await prisma.notification.update({
    where: { id: notification.id },
    data: { read: true },
  });

  return toPublicNotification(updated);
}

export async function markAllNotificationsRead(ctx: AuthContext) {
  await prisma.notification.updateMany({
    where: { userId: ctx.userId, read: false },
    data: { read: true },
  });

  return listNotifications(ctx);
}
