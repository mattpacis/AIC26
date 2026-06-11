import { Role } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { type AuthContext, assertStaff, staffDepartmentScope } from '../lib/permissions.js';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export async function listStaffDirectory(ctx: AuthContext) {
  assertStaff(ctx);

  const department = staffDepartmentScope(ctx);
  const staff = await prisma.user.findMany({
    where: {
      schoolId: ctx.schoolId,
      role: Role.STAFF,
      ...(department ? { department } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
    },
    orderBy: [{ department: 'asc' }, { name: 'asc' }],
  });

  return staff.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    department: member.department ?? 'Staff',
    initials: initials(member.name),
    isSelf: member.id === ctx.userId,
  }));
}
