export const STAFF_SIGNUP_DEPARTMENTS = [
  {
    key: 'it',
    label: 'IT Department',
    signupLabel: 'IT Support',
  },
  {
    key: 'campus-health',
    label: 'Campus Health',
    signupLabel: 'Health Services',
  },
  {
    key: 'guidance',
    label: 'Student Services',
    signupLabel: 'Student Services',
  },
  {
    key: 'registrar',
    label: "Registrar's Office",
    signupLabel: 'Registrar',
  },
] as const;

export type StaffSignupDepartmentKey =
  (typeof STAFF_SIGNUP_DEPARTMENTS)[number]['key'];

const DEPARTMENT_ALIASES: Record<string, string> = {
  registrar: "Registrar's Office",
  "registrar's office": "Registrar's Office",
  "registrar office": "Registrar's Office",
  cashier: 'Cashier Office',
  "cashier's office": 'Cashier Office',
  "cashier office": 'Cashier Office',
  it: 'IT Department',
  'it department': 'IT Department',
  'it support': 'IT Department',
  'campus health': 'Campus Health',
  'health services': 'Campus Health',
  'student services': 'Student Services',
  guidance: 'Student Services',
  counseling: 'Student Services',
  library: 'Library',
  facilities: 'Facilities',
};

export function resolveDepartmentAlias(input: string) {
  const normalized = input.trim().toLowerCase();
  return DEPARTMENT_ALIASES[normalized];
}

export function findStaffSignupDepartment(input: string) {
  const normalized = input.trim().toLowerCase();
  const alias = resolveDepartmentAlias(input);
  if (alias) {
    return STAFF_SIGNUP_DEPARTMENTS.find((dept) => dept.label === alias);
  }

  return STAFF_SIGNUP_DEPARTMENTS.find(
    (dept) =>
      dept.key === normalized ||
      dept.label.toLowerCase() === normalized ||
      dept.signupLabel.toLowerCase() === normalized,
  );
}

export function normalizeStaffDepartment(input: string) {
  return findStaffSignupDepartment(input)?.label ?? normalizeDepartmentLabel(input);
}

export function listStaffSignupDepartmentsForApi() {
  return STAFF_SIGNUP_DEPARTMENTS.map(({ key, signupLabel, label }) => ({
    key,
    signupLabel,
    label,
  }));
}

export const APPOINTMENT_DEPARTMENTS = [
  {
    key: 'registrar',
    label: "Registrar's Office",
    defaultLocation: 'Admin Building, Window 2-3',
  },
  {
    key: 'campus-health',
    label: 'Campus Health',
    defaultLocation: 'Health Center, Room 104',
  },
  {
    key: 'it',
    label: 'IT Department',
    defaultLocation: 'IT Helpdesk, Room 101',
  },
  {
    key: 'guidance',
    label: 'Student Services',
    defaultLocation: 'Counseling Center, Room 201',
  },
  {
    key: 'cashier',
    label: 'Cashier Office',
    defaultLocation: 'Finance Building, Window 1',
  },
] as const;

export type AppointmentDepartmentKey =
  (typeof APPOINTMENT_DEPARTMENTS)[number]['key'];

export const TICKET_DEPARTMENTS = [
  'IT Department',
  "Registrar's Office",
  'Campus Health',
  'Cashier Office',
  'Student Services',
  'Library',
  'Facilities',
] as const;

export type TicketDepartmentLabel = (typeof TICKET_DEPARTMENTS)[number];

export function findDepartment(input: string) {
  const normalized = input.trim().toLowerCase();
  const alias = resolveDepartmentAlias(input);
  if (alias) {
    return APPOINTMENT_DEPARTMENTS.find((dept) => dept.label === alias);
  }

  return APPOINTMENT_DEPARTMENTS.find(
    (dept) =>
      dept.key === normalized ||
      dept.label.toLowerCase() === normalized ||
      dept.label.toLowerCase().includes(normalized) ||
      normalized.includes(dept.key.replace('-', ' ')),
  );
}

export function findTicketDepartment(input: string) {
  const alias = resolveDepartmentAlias(input);
  if (alias) {
    return TICKET_DEPARTMENTS.find((label) => label === alias);
  }

  const normalized = input.trim().toLowerCase();
  return TICKET_DEPARTMENTS.find(
    (label) =>
      label.toLowerCase() === normalized ||
      label.toLowerCase().includes(normalized),
  );
}

export function normalizeDepartmentLabel(input: string) {
  return findDepartment(input)?.label ?? input.trim();
}

export function normalizeTicketDepartmentLabel(input: string) {
  return findTicketDepartment(input) ?? normalizeDepartmentLabel(input);
}

export function isKnownDepartment(input: string) {
  return Boolean(findDepartment(input) || findTicketDepartment(input));
}

export function listDepartmentsForApi() {
  return APPOINTMENT_DEPARTMENTS.map(({ key, label, defaultLocation }) => ({
    key,
    label,
    defaultLocation,
  }));
}

export function listTicketDepartmentsForApi() {
  return TICKET_DEPARTMENTS.map((label) => ({ label }));
}
