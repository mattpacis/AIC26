const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type ApiError = {
  error: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'staff' | 'admin';
  department?: string | null;
  school: {
    id: string;
    name: string;
  };
  student?: {
    id: string;
    grade: string | null;
  } | null;
};

export type StaffSignupDepartment = {
  key: string;
  signupLabel: string;
  label: string;
};

export type ChatMessageRecord = {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
};

export type ChatThreadSummary = {
  id: string;
  title: string | null;
  updatedAt: string;
  lastMessage: ChatMessageRecord | null;
};

export type ChatRequest = {
  message: string;
  sessionId?: string;
};

export type ChatResponse = {
  reply: string;
  sessionId: string;
};

export type TicketSummary = {
  id: string;
  ticketNumber: string;
  concern: string;
  status: 'open' | 'progress' | 'pending' | 'resolved';
  statusLabel: string;
  urgency: 'low' | 'med' | 'high';
  urgencyLabel: string;
  department: string;
  lastUpdate: string;
  updatedAt: string;
  scheduledDate: string | null;
};

export type TicketTrackStep = {
  label: string;
  sub: string;
  state: 'done' | 'active' | 'pending';
  lineState?: 'done' | 'active' | 'pending';
  icon?: string;
};

export type TicketDetail = TicketSummary & {
  shortTitle: string;
  title: string;
  description?: string | null;
  submitted: string;
  submittedShort: string;
  lastUpdated: string;
  confirmation?: string | null;
  assignedTo?: string | null;
  deadline?: string | null;
  estResolution?: string | null;
  appointment?: {
    datetime: string;
    location: string;
    assigned: string;
    bring: string[];
  } | null;
  trackSteps: TicketTrackStep[];
  aiUpdates: Array<{ time: string; body: string }>;
  timeline: Array<{
    title: string;
    desc: string;
    time: string;
    dotColor: string;
    showLine?: boolean;
  }>;
  related: Array<{
    ticketNumber: string;
    title: string;
    sub: string;
    icon?: string;
  }>;
  replies: TicketReply[];
  canResolve: boolean;
  canReply: boolean;
  canTake?: boolean;
  aiTriaged: boolean;
  isTaken: boolean;
  assignedStaffUserId?: string | null;
};

export type TicketReply = {
  id: string;
  content: string;
  authorName: string;
  isStudent: boolean;
  createdAt: string;
  timeLabel: string;
};

export type StudentHold = {
  id: string;
  title: string;
  description: string | null;
  department: string;
  status: 'active' | 'cleared';
  label: string;
  createdAt: string;
  updatedAt: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? 'Invalid response from server'
        : 'Unable to reach the server. Make sure the backend is running on port 3001.',
    );
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as ApiError).error === 'string'
        ? (data as ApiError).error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

function apiFetch(input: string, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

export async function checkHealth(): Promise<{ status: string }> {
  const response = await apiFetch(`${API_BASE}/health`);
  return parseJson(response);
}

export type OAuthProviders = {
  google: { enabled: boolean; label: string; startUrl: string };
  microsoft: { enabled: boolean; label: string; startUrl: string };
};

export async function getAuthProviders(): Promise<{ providers: OAuthProviders }> {
  const response = await apiFetch(`${API_BASE}/auth/providers`);
  return parseJson(response);
}

export function oauthStartUrl(provider: 'google' | 'microsoft', role: 'student' | 'staff') {
  return `${API_BASE}/auth/${provider}?role=${role}`;
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: Pick<User, 'id' | 'email' | 'name' | 'role'> }> {
  const response = await apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return parseJson(response);
}

export async function getStaffSignupDepartments(): Promise<{
  departments: StaffSignupDepartment[];
}> {
  const response = await apiFetch(`${API_BASE}/auth/staff-departments`);
  return parseJson(response);
}

export async function register(
  email: string,
  password: string,
  name: string,
  role: 'student' | 'staff',
  department?: string,
): Promise<{ user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'department'> }> {
  const response = await apiFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, name, role, department }),
  });
  return parseJson(response);
}

export async function logout(): Promise<void> {
  const response = await apiFetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  await parseJson(response);
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: boolean; message: string; resetToken?: string }> {
  const response = await apiFetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return parseJson(response);
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
}): Promise<{ ok: boolean; message: string }> {
  const response = await apiFetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean; message: string }> {
  const response = await apiFetch(`${API_BASE}/me/password`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function getMe(): Promise<{ user: User }> {
  const response = await apiFetch(`${API_BASE}/me`);
  return parseJson(response);
}

export async function getCopilotEmbedToken(): Promise<{
  token: string;
  userId: string;
  email: string;
}> {
  const response = await apiFetch(`${API_BASE}/agent/embed-token`);
  return parseJson(response);
}

export async function getCopilotDirectLineToken(): Promise<{
  token: string;
  conversationId: string;
  expiresIn: number;
  userId: string;
  email: string;
  campus360Token: string;
}> {
  const response = await apiFetch(`${API_BASE}/agent/direct-line-token`);
  return parseJson(response);
}

export async function updateProfile(name: string): Promise<{ user: User }> {
  const response = await apiFetch(`${API_BASE}/me`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
  return parseJson(response);
}

export type UserSettings = {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  profileTheme: 'blue' | 'teal' | 'amber' | 'purple' | 'green';
  onboardingComplete: boolean;
};

export async function getUserSettings(): Promise<{ settings: UserSettings }> {
  const response = await apiFetch(`${API_BASE}/me/settings`);
  return parseJson(response);
}

export async function updateUserSettings(
  input: Partial<UserSettings>,
): Promise<{ settings: UserSettings }> {
  const response = await apiFetch(`${API_BASE}/me/settings`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function deleteAccount(): Promise<void> {
  const response = await apiFetch(`${API_BASE}/me`, { method: 'DELETE' });
  await parseJson(response);
}

export type NotificationRecord = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

export async function listNotifications(): Promise<{
  notifications: NotificationRecord[];
  unreadCount: number;
}> {
  const response = await apiFetch(`${API_BASE}/notifications`);
  return parseJson(response);
}

export async function markNotificationRead(
  notificationId: string,
): Promise<{ notification: NotificationRecord }> {
  const response = await apiFetch(`${API_BASE}/notifications/${notificationId}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return parseJson(response);
}

export async function markAllNotificationsRead(): Promise<{
  notifications: NotificationRecord[];
  unreadCount: number;
}> {
  const response = await apiFetch(`${API_BASE}/notifications/read-all`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return parseJson(response);
}

export async function clearAllNotifications(): Promise<{
  notifications: NotificationRecord[];
  unreadCount: number;
}> {
  const response = await apiFetch(`${API_BASE}/notifications/clear-all`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return parseJson(response);
}

export async function getDashboard(): Promise<{
  user: User;
  summary: {
    openTicketCount: number;
    pendingActionCount: number;
    chatThreadCount: number;
  };
}> {
  const response = await apiFetch(`${API_BASE}/dashboard`);
  return parseJson(response);
}

export async function listChatThreads(): Promise<{ threads: ChatThreadSummary[] }> {
  const response = await apiFetch(`${API_BASE}/chat/threads`);
  return parseJson(response);
}

export async function createChatThread(
  title?: string,
): Promise<{ thread: ChatThreadSummary; messages: ChatMessageRecord[] }> {
  const response = await apiFetch(`${API_BASE}/chat/threads`, {
    method: 'POST',
    body: JSON.stringify(title ? { title } : {}),
  });
  return parseJson(response);
}

export async function getChatMessages(
  threadId: string,
): Promise<{ messages: ChatMessageRecord[] }> {
  const response = await apiFetch(`${API_BASE}/chat/threads/${threadId}/messages`);
  return parseJson(response);
}

export async function sendChatMessage(
  message: string,
  threadId?: string,
): Promise<{
  threadId: string;
  reply: string;
  messages: ChatMessageRecord[];
}> {
  const body: { message: string; threadId?: string } = { message };
  if (threadId) {
    body.threadId = threadId;
  }

  const response = await apiFetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseJson(response);
}

export async function listTickets(): Promise<{ tickets: TicketSummary[] }> {
  const response = await apiFetch(`${API_BASE}/tickets`);
  return parseJson(response);
}

export async function getTicket(
  ticketNumber: string,
): Promise<{ ticket: TicketDetail }> {
  const normalized = ticketNumber.replace(/^#/, '');
  const response = await apiFetch(`${API_BASE}/tickets/${normalized}`);
  return parseJson(response);
}

export async function createTicket(input: {
  concern: string;
  title?: string;
  description?: string;
  department: string;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
}): Promise<{ ticket: TicketDetail }> {
  const response = await apiFetch(`${API_BASE}/tickets`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function addTicketReply(
  ticketNumber: string,
  content: string,
): Promise<{ ticket: TicketDetail }> {
  const normalized = ticketNumber.replace(/^#/, '');
  const response = await apiFetch(`${API_BASE}/tickets/${normalized}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return parseJson(response);
}

export async function resolveTicket(
  ticketNumber: string,
): Promise<{ ticket: TicketDetail }> {
  const normalized = ticketNumber.replace(/^#/, '');
  const response = await apiFetch(`${API_BASE}/tickets/${normalized}/resolve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return parseJson(response);
}

export async function deleteTicket(
  ticketNumber: string,
): Promise<{ ticketNumber: string }> {
  const normalized = ticketNumber.replace(/^#/, '');
  const response = await apiFetch(`${API_BASE}/tickets/${normalized}`, {
    method: 'DELETE',
  });
  return parseJson(response);
}

export async function listHolds(): Promise<{ holds: StudentHold[] }> {
  const response = await apiFetch(`${API_BASE}/holds`);
  return parseJson(response);
}

export async function getHoldSummary(): Promise<{
  summary: {
    activeCount: number;
    clearedCount: number;
    totalCount: number;
    holds: StudentHold[];
    lastUpdated: string | null;
  };
}> {
  const response = await apiFetch(`${API_BASE}/holds/summary`);
  return parseJson(response);
}

export type AppointmentDetailRow = {
  label: string;
  value: string;
  link?: string;
  warn?: boolean;
};

export type AppointmentRecord = {
  id: string;
  title: string;
  department: string;
  purpose?: string | null;
  location?: string | null;
  staffName?: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  urgencyLabel?: string | null;
  barColor: string;
  ticketNumber?: string | null;
  scheduledAt: string;
  date: string;
  time: string;
  deadline?: string | null;
  bringItems: string[];
  details: AppointmentDetailRow[];
  miniSub: string;
  studentName?: string | null;
  studentEmail?: string | null;
};

export type AppointmentSummary = {
  upcomingCount: number;
  completedCount: number;
  nextAppointment: { label: string; title: string } | null;
  reminder: string | null;
};

export type AppointmentDepartment = {
  key: string;
  label: string;
  defaultLocation: string;
};

export type AvailabilitySlot = {
  id: string;
  startsAt: string;
  day: number;
  month: number;
  calendarMonth?: number;
  year: number;
  weekday?: string;
  dateLabel?: string;
  timeLabel: string;
  bookingHint?: string;
};

export type AvailabilityOpenDate = {
  dateLabel: string;
  weekday: string;
  day: number;
  calendarMonth: number;
  month: number;
  year: number;
  times: Array<{ timeLabel: string; startsAt: string }>;
};

export type DepartmentAvailability = {
  department: string;
  defaultLocation: string;
  year: number;
  month: number;
  monthLabel?: string;
  monthIsZeroBased?: boolean;
  weekdaysOnly?: boolean;
  availableDays: number[];
  openDates?: AvailabilityOpenDate[];
  bookingRules?: string;
  forCopilot?: string;
  slots: AvailabilitySlot[];
};

function buildAppointmentQuery(params: {
  status?: 'all' | 'upcoming' | 'completed';
  year?: number;
  month?: number;
  day?: number;
}) {
  const search = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    search.set('status', params.status);
  }
  if (params.year !== undefined) search.set('year', String(params.year));
  if (params.month !== undefined) search.set('month', String(params.month));
  if (params.day !== undefined) search.set('day', String(params.day));
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listAppointments(params: {
  status?: 'all' | 'upcoming' | 'completed';
  year?: number;
  month?: number;
  day?: number;
} = {}): Promise<{ appointments: AppointmentRecord[] }> {
  const response = await apiFetch(
    `${API_BASE}/appointments${buildAppointmentQuery(params)}`,
  );
  return parseJson(response);
}

export async function getAppointmentSummary(): Promise<{
  summary: AppointmentSummary;
}> {
  const response = await apiFetch(`${API_BASE}/appointments/summary`);
  return parseJson(response);
}

export async function listAppointmentDepartments(): Promise<{
  departments: AppointmentDepartment[];
}> {
  const response = await apiFetch(`${API_BASE}/appointments/departments`);
  return parseJson(response);
}

export async function getAppointmentAvailability(params: {
  department: string;
  year: number;
  month: number;
  day?: number;
  excludeAppointmentId?: string;
}): Promise<{ availability: DepartmentAvailability }> {
  const search = new URLSearchParams({
    department: params.department,
    year: String(params.year),
    month: String(params.month),
  });
  if (params.day !== undefined) search.set('day', String(params.day));
  if (params.excludeAppointmentId) {
    search.set('excludeAppointmentId', params.excludeAppointmentId);
  }
  const response = await apiFetch(
    `${API_BASE}/appointments/availability?${search.toString()}`,
  );
  return parseJson(response);
}

export async function createAppointment(input: {
  title: string;
  department: string;
  purpose?: string;
  location?: string;
  staffName?: string;
  scheduledAt: string;
  deadline?: string;
  ticketNumber?: string;
  bringItems?: string[];
  studentUserId?: string;
}): Promise<{ appointment: AppointmentRecord }> {
  const response = await apiFetch(`${API_BASE}/appointments`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function rescheduleAppointment(
  appointmentId: string,
  scheduledAt: string,
): Promise<{ appointment: AppointmentRecord }> {
  const response = await apiFetch(
    `${API_BASE}/appointments/${appointmentId}/reschedule`,
    {
      method: 'PATCH',
      body: JSON.stringify({ scheduledAt }),
    },
  );
  return parseJson(response);
}

export async function cancelAppointment(
  appointmentId: string,
): Promise<{ appointment: AppointmentRecord }> {
  const response = await apiFetch(
    `${API_BASE}/appointments/${appointmentId}/cancel`,
    {
      method: 'PATCH',
      body: JSON.stringify({}),
    },
  );
  return parseJson(response);
}

export async function deleteAppointment(
  appointmentId: string,
): Promise<{ id: string }> {
  const response = await apiFetch(`${API_BASE}/appointments/${appointmentId}`, {
    method: 'DELETE',
  });
  return parseJson(response);
}

export type StaffAnalytics = {
  summary: {
    queueCount: number;
    openCount: number;
    progressCount: number;
    scheduledCount: number;
    resolvedCount: number;
    resolvedThisWeek: number;
  };
  urgency: {
    low: number;
    medium: number;
    high: number;
  };
  resolution: {
    average: string | null;
    withinTargetPercent: number | null;
    targetLabel: string;
    sampleSize: number;
  };
  statusBreakdown: Array<{
    key: string;
    label: string;
    count: number;
  }>;
};

export async function getStaffAnalytics(): Promise<StaffAnalytics> {
  const response = await apiFetch(`${API_BASE}/staff/analytics`);
  return parseJson(response);
}

/** @deprecated Use sendChatMessage instead */
export async function sendMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const response = await apiFetch(`${API_BASE}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, sessionId }),
  });
  return parseJson(response);
}

export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export type StaffQueueTicket = {
  id: string;
  ticketNumber: string;
  time: string;
  concern: string;
  studentName: string;
  studentEmail: string;
  status: 'open' | 'progress' | 'sched' | 'resolved';
  statusLabel: string;
  urgency: 'low' | 'med' | 'high';
  urgencyLabel: string;
  aiTriaged?: boolean;
  submittedAt: string;
  scheduledLabel?: string;
  aiSummary: string;
  staffNotes?: string | null;
  isTaken: boolean;
  isClosed: boolean;
  appointmentId?: string | null;
  assignedStaffUserId?: string | null;
  student: {
    initials: string;
    program: string;
    studentId: string;
    tags: Array<{ label: string; bg: string; color: string }>;
    ticketsThisSem: number;
  };
  info: {
    purpose: string;
    deadline: string;
    deadlineWarn?: boolean;
    appointment: string;
    assignedTo: string;
  };
  steps: Array<{ text: string; tag?: string }>;
  trackSteps?: TicketTrackStep[];
  suggestedStaffNotes?: string;
  replies: TicketReply[];
};

export type StaffDashboardUser = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  roleLabel: string;
  initials: string;
};

export type StaffDashboardSummary = {
  queueCount: number;
  openCount: number;
  scheduledCount: number;
  progressCount: number;
  resolvedCount: number;
  todayAppointmentCount: number;
};

export type StaffTodayAppointment = {
  id: string;
  time: string;
  title: string;
  department: string;
  studentName: string;
  studentEmail: string;
  location: string | null;
  ticketNumber: string | null;
};

export type StaffStudentListItem = {
  id: string;
  userId: string;
  initials: string;
  name: string;
  email: string;
  phone: string | null;
  yearLevel: string | null;
  program: string | null;
  college: string | null;
  sub: string;
  enrollmentStatus: string;
  enrollmentWarn: boolean;
  hasHold: boolean;
  hasOpenTicket: boolean;
  hasHealthFlag: boolean;
  stats: { tickets: number; holds: number; appts: number; nextAppointment: string };
  listTags: Array<{ label: string; type: 'hold' | 'sched' }>;
};

export type StaffStudentProfile = StaffStudentListItem & {
  holds: Array<{
    id: string;
    title: string;
    description: string | null;
    department: string;
    label: string;
  }>;
  tickets: TicketSummary[];
  appointments: Array<{
    id: string;
    title: string;
    department: string;
    scheduledAt: string;
    status: string;
  }>;
  healthNotes: Array<{ text: string }>;
  profileTags: Array<{ label: string; type?: string }>;
};

export type StaffKbArticleSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  department: string;
  category: string;
  tags: string[];
  views: number;
  readTime: string;
  updated: string;
  aiReferenced: boolean;
  filters: string[];
};

export type StaffKbArticleDetail = StaffKbArticleSummary & {
  overview: string[];
  requirements: string[];
  steps: Array<{ text: string; tag?: string }>;
  note: string | null;
  relatedIds: string[];
};

export type StaffResolutionSummary = {
  average: string | null;
  withinTargetPercent: number | null;
  targetLabel: string;
  sampleSize: number;
};

export async function getStaffDashboard(): Promise<{
  user: StaffDashboardUser;
  summary: StaffDashboardSummary;
  todayAppointments: StaffTodayAppointment[];
  queuePreview: StaffQueueTicket[];
  resolution: StaffResolutionSummary;
}> {
  const response = await apiFetch(`${API_BASE}/staff/dashboard`);
  return parseJson(response);
}

export type StaffDirectoryMember = {
  id: string;
  name: string;
  email: string;
  department: string;
  initials: string;
  isSelf: boolean;
};

export async function listStaffDirectory(): Promise<{ members: StaffDirectoryMember[] }> {
  const response = await apiFetch(`${API_BASE}/staff/directory`);
  return parseJson(response);
}

export async function listStaffTickets(filters?: {
  status?: string;
  urgency?: string;
  includeResolved?: boolean;
  mineOnly?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'urgency' | 'student';
}): Promise<{ tickets: StaffQueueTicket[] }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.urgency) params.set('urgency', filters.urgency);
  if (filters?.includeResolved) params.set('includeResolved', 'true');
  if (filters?.mineOnly) params.set('mineOnly', 'true');
  if (filters?.search) params.set('search', filters.search);
  if (filters?.sort) params.set('sort', filters.sort);
  const query = params.toString();
  const response = await apiFetch(
    `${API_BASE}/staff/tickets${query ? `?${query}` : ''}`,
  );
  return parseJson(response);
}

export async function createStaffTicket(input: {
  studentUserId: string;
  concern: string;
  description?: string;
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH';
}): Promise<{ ticket: StaffQueueTicket }> {
  const response = await apiFetch(`${API_BASE}/staff/tickets`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function takeStaffTicket(ticketNumber: string): Promise<{
  ticket: TicketDetail & { queue?: StaffQueueTicket };
}> {
  const response = await apiFetch(
    `${API_BASE}/staff/tickets/${ticketNumber.replace(/^#/, '')}/take`,
    { method: 'POST', body: JSON.stringify({}) },
  );
  return parseJson(response);
}

export async function rescheduleStaffTicket(
  ticketNumber: string,
  scheduledAt: string,
): Promise<{ ticket: TicketDetail & { queue?: StaffQueueTicket } }> {
  const response = await apiFetch(
    `${API_BASE}/staff/tickets/${ticketNumber.replace(/^#/, '')}/reschedule`,
    {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    },
  );
  return parseJson(response);
}

export async function updateStaffTicket(
  ticketNumber: string,
  body: { status?: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED'; staffNotes?: string },
): Promise<{ ticket: TicketDetail & { queue?: StaffQueueTicket } }> {
  const response = await apiFetch(
    `${API_BASE}/staff/tickets/${ticketNumber.replace(/^#/, '')}`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    },
  );
  return parseJson(response);
}

export async function addStaffTicketReply(
  ticketNumber: string,
  content: string,
): Promise<{ ticket: TicketDetail }> {
  const response = await apiFetch(
    `${API_BASE}/staff/tickets/${ticketNumber.replace(/^#/, '')}/replies`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
  );
  return parseJson(response);
}

export async function listStaffStudents(filters?: {
  holds?: boolean;
  openTickets?: boolean;
  yearLevel?: string;
  program?: string;
}): Promise<{ students: StaffStudentListItem[] }> {
  const params = new URLSearchParams();
  if (filters?.holds) params.set('holds', 'true');
  if (filters?.openTickets) params.set('openTickets', 'true');
  if (filters?.yearLevel) params.set('yearLevel', filters.yearLevel);
  if (filters?.program) params.set('program', filters.program);
  const query = params.toString();
  const response = await apiFetch(
    `${API_BASE}/staff/students${query ? `?${query}` : ''}`,
  );
  return parseJson(response);
}

export async function getStaffStudentProfile(
  studentKey: string,
): Promise<{ student: StaffStudentProfile }> {
  const response = await apiFetch(`${API_BASE}/staff/students/${studentKey}`);
  return parseJson(response);
}

export async function listStaffKbArticles(filters?: {
  category?: string;
  search?: string;
  aiReferenced?: boolean;
}): Promise<{ articles: StaffKbArticleSummary[] }> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.aiReferenced) params.set('aiReferenced', 'true');
  const query = params.toString();
  const response = await apiFetch(
    `${API_BASE}/staff/knowledge-base${query ? `?${query}` : ''}`,
  );
  return parseJson(response);
}

export async function getStaffKbArticle(
  slug: string,
): Promise<{ article: StaffKbArticleDetail }> {
  const response = await apiFetch(`${API_BASE}/staff/knowledge-base/${slug}`);
  return parseJson(response);
}

export async function listStaffAppointments(params: {
  status?: 'all' | 'upcoming' | 'completed';
  year?: number;
  month?: number;
  day?: number;
} = {}): Promise<{ appointments: AppointmentRecord[] }> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.year !== undefined) search.set('year', String(params.year));
  if (params.month !== undefined) search.set('month', String(params.month));
  if (params.day !== undefined) search.set('day', String(params.day));
  const query = search.toString();
  const response = await apiFetch(
    `${API_BASE}/staff/appointments${query ? `?${query}` : ''}`,
  );
  return parseJson(response);
}

export type StaffAppointmentSlot = {
  id: string;
  startsAt: string;
  dateLabel: string;
  timeLabel: string;
  isOpen: boolean;
  isBooked: boolean;
  isPast: boolean;
};

export async function listStaffAppointmentSlots(params: {
  year: number;
  month: number;
  day?: number;
}): Promise<{ slots: StaffAppointmentSlot[] }> {
  const search = new URLSearchParams({
    year: String(params.year),
    month: String(params.month),
  });
  if (params.day !== undefined) search.set('day', String(params.day));
  const response = await apiFetch(
    `${API_BASE}/staff/appointment-slots?${search.toString()}`,
  );
  return parseJson(response);
}

export async function createStaffAppointmentSlot(
  startsAt: string,
): Promise<{ slot: StaffAppointmentSlot }> {
  const response = await apiFetch(`${API_BASE}/staff/appointment-slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startsAt }),
  });
  return parseJson(response);
}

export async function updateStaffAppointmentSlot(
  slotId: string,
  body: { startsAt?: string; isOpen?: boolean },
): Promise<{ slot: StaffAppointmentSlot }> {
  const response = await apiFetch(`${API_BASE}/staff/appointment-slots/${slotId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson(response);
}
