import { prisma } from '../lib/db.js';
import { type AuthContext, AppError } from '../lib/permissions.js';
import { logAction } from './actionLogService.js';

export type UserSettings = {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  profileTheme: 'blue' | 'teal' | 'amber' | 'purple' | 'green';
  onboardingComplete: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  appointmentReminders: true,
  profileTheme: 'blue',
  onboardingComplete: false,
};

const PROFILE_THEMES = new Set<UserSettings['profileTheme']>([
  'blue',
  'teal',
  'amber',
  'purple',
  'green',
]);

function parseProfileTheme(value: unknown): UserSettings['profileTheme'] {
  if (typeof value === 'string' && PROFILE_THEMES.has(value as UserSettings['profileTheme'])) {
    return value as UserSettings['profileTheme'];
  }
  return DEFAULT_SETTINGS.profileTheme;
}

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
      profileTheme: parseProfileTheme(parsed.profileTheme),
      onboardingComplete:
        typeof parsed.onboardingComplete === 'boolean'
          ? parsed.onboardingComplete
          : DEFAULT_SETTINGS.onboardingComplete,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function readPreferencesObject(raw: string | null | undefined) {
  if (!raw) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
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
    profileTheme: input.profileTheme ?? current.profileTheme,
    onboardingComplete: input.onboardingComplete ?? current.onboardingComplete,
  };

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { preferences: true },
  });
  const merged = {
    ...readPreferencesObject(user?.preferences),
    ...next,
  };

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { preferences: JSON.stringify(merged) },
  });

  await logAction(ctx.userId, 'settings.update', next);

  return next;
}
