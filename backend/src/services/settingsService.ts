import { prisma } from '../lib/db.js';
import { type AuthContext, AppError } from '../lib/permissions.js';
import { logAction } from './actionLogService.js';

export type UserSettings = {
  emailNotifications: boolean;
  appointmentReminders: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  appointmentReminders: true,
};

function parsePreferences(raw: string | null | undefined): UserSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      emailNotifications:
        typeof parsed.emailNotifications === 'boolean'
          ? parsed.emailNotifications
          : DEFAULT_SETTINGS.emailNotifications,
      appointmentReminders:
        typeof parsed.appointmentReminders === 'boolean'
          ? parsed.appointmentReminders
          : DEFAULT_SETTINGS.appointmentReminders,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function getUserSettings(ctx: AuthContext) {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { preferences: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return parsePreferences(user.preferences);
}

export async function updateUserSettings(
  ctx: AuthContext,
  input: Partial<UserSettings>,
) {
  const current = await getUserSettings(ctx);
  const next: UserSettings = {
    emailNotifications:
      input.emailNotifications ?? current.emailNotifications,
    appointmentReminders:
      input.appointmentReminders ?? current.appointmentReminders,
  };

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { preferences: JSON.stringify(next) },
  });

  await logAction(ctx.userId, 'settings.update', next);

  return next;
}
