import type { Role } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type AuthContext = {
  userId: string;
  role: Role;
  schoolId: string;
  department?: string | null;
};

export function staffDepartmentScope(ctx: AuthContext) {
  if (ctx.role === 'ADMIN') {
    return null;
  }

  return ctx.department ?? null;
}

export function assertStaffDepartmentAccess(
  ctx: AuthContext,
  ticketDepartment: string,
) {
  if (ctx.role === 'ADMIN') {
    return;
  }

  if (ctx.role !== 'STAFF') {
    return;
  }

  if (!ctx.department) {
    throw new AppError(403, 'Your staff account is not assigned to a department');
  }

  if (ctx.department !== ticketDepartment) {
    throw new AppError(403, 'You can only access tickets for your department');
  }
}

export function assertCanReplyToTicket(
  ctx: AuthContext,
  ticket: {
    studentUserId: string;
    schoolId: string;
    department: string;
    status: string;
    assignedStaffUserId: string | null;
  },
) {
  assertCanViewTicket(ctx, ticket);

  if (ticket.status === 'RESOLVED') {
    throw new AppError(400, 'Cannot reply to a closed ticket');
  }

  if (!ticket.assignedStaffUserId) {
    throw new AppError(
      403,
      'Messaging is available after a staff member takes this ticket',
    );
  }

  if (ctx.role === 'STUDENT') {
    return;
  }

  assertStaffDepartmentAccess(ctx, ticket.department);
}

export function assertSameSchool(ctx: AuthContext, schoolId: string) {
  if (ctx.schoolId !== schoolId) {
    throw new AppError(403, 'Access denied for this school');
  }
}

export function assertRole(ctx: AuthContext, ...roles: Role[]) {
  if (!roles.includes(ctx.role)) {
    throw new AppError(403, 'You do not have permission for this action');
  }
}

export function assertCanViewTicket(
  ctx: AuthContext,
  ticket: { studentUserId: string; schoolId: string; department?: string },
) {
  assertSameSchool(ctx, ticket.schoolId);

  if (ctx.role === 'STUDENT' && ticket.studentUserId !== ctx.userId) {
    throw new AppError(403, 'You can only view your own tickets');
  }

  if (ctx.role === 'STAFF' && ticket.department) {
    assertStaffDepartmentAccess(ctx, ticket.department);
  }
}

export function assertCanCreateTicketFor(
  ctx: AuthContext,
  targetStudentUserId: string,
) {
  if (ctx.role === 'STUDENT' && targetStudentUserId !== ctx.userId) {
    throw new AppError(403, 'Students can only create tickets for themselves');
  }
}

export function assertStaff(ctx: AuthContext) {
  assertRole(ctx, 'STAFF', 'ADMIN');
}

export function assertCanUpdateTicket(ctx: AuthContext) {
  assertStaff(ctx);
}

export function assertCanCancelTicket(
  ctx: AuthContext,
  ticket: { studentUserId: string; schoolId: string; status: string },
) {
  assertCanViewTicket(ctx, ticket);

  if (ctx.role !== 'STUDENT') {
    throw new AppError(403, 'Only students can cancel tickets from this endpoint');
  }

  if (ticket.status === 'RESOLVED') {
    throw new AppError(400, 'This ticket is already closed');
  }
}

export function assertCanDeleteTicket(
  ctx: AuthContext,
  ticket: { studentUserId: string; schoolId: string; status: string },
) {
  assertCanViewTicket(ctx, ticket);

  if (ctx.role !== 'STUDENT') {
    throw new AppError(403, 'Only students can delete tickets from this endpoint');
  }

  if (ticket.status !== 'RESOLVED') {
    throw new AppError(400, 'Only resolved tickets can be deleted');
  }
}
