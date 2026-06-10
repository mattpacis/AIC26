import { Role } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { createNotification } from './notificationService.js';

export async function notifyDepartmentStaff(
  schoolId: string,
  department: string,
  input: { title: string; body: string; link?: string },
) {
  const staff = await prisma.user.findMany({
    where: {
      schoolId,
      role: { in: [Role.STAFF, Role.ADMIN] },
      department,
    },
    select: { id: true },
  });

  await Promise.all(
    staff.map((member) => createNotification(member.id, input)),
  );
}

export async function notifyUser(
  userId: string,
  input: { title: string; body: string; link?: string },
) {
  await createNotification(userId, input);
}
