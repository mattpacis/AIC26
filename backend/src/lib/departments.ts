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
    signupLabel: "Registrar's Office",
  },
] as const;

export type StaffSignupDepartmentKey =
  (typeof STAFF_SIGNUP_DEPARTMENTS)[number]['key'];

export function findStaffSignupDepartment(input: string) {
  const normalized = input.trim().toLowerCase();
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

export function findDepartment(input: string) {
  const normalized = input.trim().toLowerCase();
  return APPOINTMENT_DEPARTMENTS.find(
    (dept) =>
      dept.key === normalized ||
      dept.label.toLowerCase() === normalized ||
      dept.label.toLowerCase().includes(normalized) ||
      normalized.includes(dept.key.replace('-', ' ')),
  );
}

export function normalizeDepartmentLabel(input: string) {
  return findDepartment(input)?.label ?? input.trim();
}

export function isKnownDepartment(input: string) {
  return Boolean(findDepartment(input));
}

export function listDepartmentsForApi() {
  return APPOINTMENT_DEPARTMENTS.map(({ key, label, defaultLocation }) => ({
    key,
    label,
    defaultLocation,
  }));
}
