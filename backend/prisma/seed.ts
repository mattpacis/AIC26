import bcrypt from 'bcryptjs';
import {
  AppointmentStatus,
  PrismaClient,
  Role,
  TicketStatus,
  TicketUrgency,
} from '@prisma/client';

const prisma = new PrismaClient();

const TICKET_SEEDS = [
  {
    ticketNumber: '12293031',
    concern: 'Library Wi-Fi outage',
    title: 'Library Wi-Fi outage',
    status: TicketStatus.IN_PROGRESS,
    urgency: TicketUrgency.MEDIUM,
    department: 'IT Department',
    assignedTo: 'IT Helpdesk',
    confirmation:
      'IT Department is investigating the Main Library Wi-Fi outage. You will be notified when service is restored.',
    createdAt: new Date('2026-09-07T09:45:00'),
    updatedAt: new Date('2026-09-07T09:45:00'),
    deadline: new Date('2026-09-08'),
    estResolution: new Date('2026-09-08'),
    scheduledDate: new Date('2026-09-07T09:00:00'),
    detailPayload: {
      shortTitle: 'Library Wi-Fi outage',
      trackSteps: [
        { label: 'Submitted', sub: 'Sep 7, 9:45 AM', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'AI triaged', sub: 'Sep 7, 9:45 AM', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'Routed to dept.', sub: 'IT Department', state: 'done', lineState: 'active', icon: 'check' },
        { label: 'Under review', sub: 'In progress', state: 'active', lineState: 'pending', icon: 'clock' },
        { label: 'Resolved', sub: 'Pending', state: 'pending', icon: 'circle-check' },
      ],
      aiUpdates: [
        {
          time: 'Sep. 7 · 9:45 AM',
          body: 'I created ticket #12293031 for the Main Library Wi-Fi outage and routed it to the IT Department. Current status: under review.',
        },
      ],
      timeline: [
        {
          title: 'Ticket created via AI Helpdesk',
          desc: 'You reported Wi-Fi down in the Main Library during your helpdesk conversation.',
          time: 'Sep. 7, 2026 · 9:45 AM',
          dotColor: '#7C3AED',
          showLine: true,
        },
        {
          title: 'Routed to IT Department',
          desc: 'AI classified concern as network outage and assigned it to IT.',
          time: 'Sep. 7, 2026 · 9:45 AM',
          dotColor: '#2563EB',
          showLine: false,
        },
      ],
      related: [
        {
          ticketNumber: '12295006',
          title: 'Medical certificate — NSTP',
          sub: '#12295006 · Campus Health · Scheduled',
          icon: 'certificate',
        },
        {
          ticketNumber: '12289014',
          title: 'Tuition hold — balance due',
          sub: "#12289014 · Cashier · Action needed",
          icon: 'cash',
        },
      ],
    },
  },
  {
    ticketNumber: '12295006',
    concern: 'Medical certificate — NSTP',
    title: 'Medical certificate request — NSTP clearance',
    status: TicketStatus.PENDING,
    urgency: TicketUrgency.LOW,
    department: 'Campus Health',
    assignedTo: 'Maria Reyes',
    confirmation:
      'Your appointment has been confirmed for Sept 10 at 9:00 AM — Campus Health, Room 104',
    createdAt: new Date('2026-09-07T09:45:00'),
    updatedAt: new Date('2026-09-07T09:45:00'),
    deadline: new Date('2026-09-19'),
    estResolution: new Date('2026-09-10'),
    scheduledDate: new Date('2026-09-10T09:00:00'),
    detailPayload: {
      shortTitle: 'Medical certificate request',
      appointment: {
        datetime: 'Sept 10 · 9:00 AM',
        location: 'Campus Health Office · Room 104',
        assigned: 'Assigned to Maria Reyes',
        bring: ['School ID', 'NSTP enrollment form', 'Printed appointment confirmation'],
      },
      trackSteps: [
        { label: 'Submitted', sub: 'Sep 7, 9:45 AM', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'AI triaged', sub: 'Sep 7, 9:45 AM', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'Routed to dept.', sub: 'Campus Health', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'Appointment set', sub: 'Sep 10, 9:00 AM', state: 'active', lineState: 'active', icon: 'calendar-check' },
        { label: 'Certificate issued', sub: 'Pending visit', state: 'pending', lineState: 'pending', icon: 'certificate' },
        { label: 'Resolved', sub: 'Est. Sep 10', state: 'pending', icon: 'circle-check' },
      ],
      aiUpdates: [
        {
          time: 'Sep. 7 · 9:45 AM',
          body: "Your request has been received and routed to the Campus Health office. Based on your concern, I've identified this as a medical certificate request for NSTP clearance. An appointment slot has been auto-booked for you on Sept 10 at 9:00 AM in Room 104. Please bring your school ID and a copy of your NSTP enrollment form on the day of your visit.",
        },
        {
          time: 'Sep. 7 · 9:46 AM',
          body: 'Your NSTP clearance deadline is September 19. Your appointment on Sept 10 gives you enough time to submit the certificate before the deadline. I\'ll send you a reminder 24 hours before your appointment. If you need to reschedule, tap the "Follow up" button above.',
        },
      ],
      timeline: [
        {
          title: 'Ticket created via AI Helpdesk',
          desc: 'You asked the AI about a medical certificate for NSTP. Campus360 AI identified the concern and created this ticket automatically.',
          time: 'Sep. 7, 2026 · 9:45 AM',
          dotColor: '#7C3AED',
          showLine: true,
        },
        {
          title: 'Routed to Campus Health',
          desc: 'AI classified concern as medical certificate request and assigned it to the Campus Health department.',
          time: 'Sep. 7, 2026 · 9:45 AM',
          dotColor: '#2563EB',
          showLine: true,
        },
        {
          title: 'Appointment auto-scheduled',
          desc: 'Campus Health confirmed an available slot. Your appointment is set for Sept 10 at 9:00 AM, Room 104. Assigned to Maria Reyes.',
          time: 'Sep. 7, 2026 · 9:45 AM',
          dotColor: '#22c55e',
          showLine: false,
        },
      ],
      related: [
        {
          ticketNumber: '12293031',
          title: 'Library Wi-Fi outage',
          sub: '#12293031 · IT Dept · In progress',
          icon: 'wifi',
        },
        {
          ticketNumber: '12289014',
          title: 'Tuition hold — balance due',
          sub: '#12289014 · Cashier · Action needed',
          icon: 'cash',
        },
      ],
    },
  },
  {
    ticketNumber: '12289014',
    concern: 'Tuition hold — balance due',
    title: 'Tuition hold — balance due',
    status: TicketStatus.OPEN,
    urgency: TicketUrgency.HIGH,
    department: "Cashier's Office",
    assignedTo: "Cashier's Office",
    confirmation: 'Balance of ₱18,400 is due. Visit the Cashier\'s Office or pay via GCash to clear your hold.',
    createdAt: new Date('2026-09-05T10:00:00'),
    updatedAt: new Date('2026-09-05T10:00:00'),
    deadline: new Date('2026-09-15'),
    estResolution: new Date('2026-09-12'),
    scheduledDate: new Date('2026-09-12T14:00:00'),
    detailPayload: {
      shortTitle: 'Tuition hold — balance due',
      trackSteps: [
        { label: 'Submitted', sub: 'Sep 5, 10:00 AM', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'AI triaged', sub: 'Sep 5, 10:00 AM', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'Action needed', sub: 'Payment required', state: 'active', lineState: 'pending', icon: 'cash' },
        { label: 'Resolved', sub: 'Pending payment', state: 'pending', icon: 'circle-check' },
      ],
      aiUpdates: [
        {
          time: 'Sep. 5 · 10:00 AM',
          body: 'Your account has an outstanding balance of ₱18,400. This tuition hold must be cleared at the Cashier\'s Office before enrollment actions can proceed.',
        },
      ],
      timeline: [
        {
          title: 'Hold detected',
          desc: 'AI identified an active tuition hold on your account during a helpdesk conversation.',
          time: 'Sep. 5, 2026 · 10:00 AM',
          dotColor: '#F59E0B',
          showLine: false,
        },
      ],
      related: [],
    },
  },
  {
    ticketNumber: '12271003',
    concern: 'Dropped subject appeal',
    title: 'Dropped subject appeal',
    status: TicketStatus.RESOLVED,
    urgency: TicketUrgency.LOW,
    department: "Registrar's Office",
    assignedTo: 'Roberto Garcia',
    confirmation: 'Your dropped subject appeal was approved. Your enrollment record has been updated.',
    createdAt: new Date('2026-08-28T14:00:00'),
    updatedAt: new Date('2026-08-28T16:30:00'),
    deadline: new Date('2026-09-01'),
    estResolution: new Date('2026-08-28'),
    scheduledDate: new Date('2026-08-28T14:00:00'),
    detailPayload: {
      shortTitle: 'Dropped subject appeal',
      trackSteps: [
        { label: 'Submitted', sub: 'Aug 28', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'Under review', sub: 'Registrar', state: 'done', lineState: 'done', icon: 'check' },
        { label: 'Resolved', sub: 'Aug 28', state: 'done', icon: 'circle-check' },
      ],
      aiUpdates: [
        {
          time: 'Aug. 28 · 4:30 PM',
          body: 'Your dropped subject appeal has been approved by the Registrar. No further action is needed.',
        },
      ],
      timeline: [
        {
          title: 'Appeal resolved',
          desc: 'Registrar approved your dropped subject appeal and updated your records.',
          time: 'Aug. 28, 2026 · 4:30 PM',
          dotColor: '#22c55e',
          showLine: false,
        },
      ],
      related: [],
    },
  },
] as const;

const APPOINTMENT_SEEDS = [
  {
    title: 'Campus Health — Medical certificate',
    department: 'Campus Health',
    purpose: 'NSTP clearance requirement',
    location: 'Room 104',
    staffName: 'Maria Reyes',
    status: AppointmentStatus.SCHEDULED,
    urgencyLabel: 'Low urgency',
    barColor: '#14B8A6',
    ticketNumber: '12295006',
    scheduledAt: new Date('2026-09-10T09:00:00'),
    deadline: new Date('2026-09-19'),
    bringItems: ['School ID', 'NSTP enrollment form', 'Printed appointment confirmation'],
  },
  {
    title: 'Registrar — ID photo submission',
    department: "Registrar's Office",
    purpose: 'Missing ID photo — Registrar hold',
    location: 'Window 3',
    status: AppointmentStatus.SCHEDULED,
    barColor: '#2E5BA8',
    scheduledAt: new Date('2026-09-12T14:00:00'),
  },
  {
    title: 'Guidance counseling session',
    department: 'Student Services',
    purpose: 'General wellness check-in',
    location: 'Room 201',
    staffName: 'Dr. Patricia Lim',
    status: AppointmentStatus.SCHEDULED,
    barColor: '#F59E0B',
    scheduledAt: new Date('2026-09-16T10:30:00'),
  },
  {
    title: 'Campus Health — Annual PE exam',
    department: 'Campus Health',
    location: 'Room 102',
    status: AppointmentStatus.COMPLETED,
    barColor: '#e2e8f0',
    scheduledAt: new Date('2026-08-28T10:00:00'),
  },
  {
    title: 'Registrar — Enrollment appeal',
    department: "Registrar's Office",
    location: 'Window 2',
    status: AppointmentStatus.COMPLETED,
    barColor: '#e2e8f0',
    scheduledAt: new Date('2026-08-20T13:00:00'),
  },
] as const;

function slot(department: string, year: number, month: number, day: number, hour: number, minute = 0) {
  return {
    department,
    startsAt: new Date(year, month, day, hour, minute, 0, 0),
  };
}

/** Weekday slots from demo today (Jun 9) through Oct 2026 for all booking departments. */
function buildAppointmentSlotSeeds() {
  const departments = [
    'Campus Health',
    "Registrar's Office",
    'IT Department',
    'Student Services',
    'Cashier Office',
  ] as const;

  const dailyTimes: Array<[number, number]> = [
    [9, 0],
    [10, 30],
    [14, 0],
  ];

  const seeds: ReturnType<typeof slot>[] = [];
  const start = new Date(2026, 5, 9);
  const end = new Date(2026, 10, 1);

  for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const day = cursor.getDate();

    for (const department of departments) {
      for (const [hour, minute] of dailyTimes) {
        seeds.push(slot(department, year, month, day, hour, minute));
      }
    }
  }

  return seeds;
}

const APPOINTMENT_SLOT_SEEDS = buildAppointmentSlotSeeds();

async function main() {
  const passwordHash = await bcrypt.hash('campus360', 10);

  const school = await prisma.school.upsert({
    where: { id: 'seed-school-1' },
    update: { name: 'Campus360 University' },
    create: {
      id: 'seed-school-1',
      name: 'Campus360 University',
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: 'alex.johnson@university.edu' },
    update: {},
    create: {
      email: 'alex.johnson@university.edu',
      passwordHash,
      name: 'Alex Johnson',
      role: Role.STUDENT,
      schoolId: school.id,
    },
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {
      grade: '3rd Year',
      yearLevel: '3rd Year',
      studentNumber: '2024-10882',
      program: 'BS Computer Science',
      college: 'College of Engineering',
      phone: '+63 917 555 0142',
      healthFlags: JSON.stringify([]),
    },
    create: {
      userId: studentUser.id,
      schoolId: school.id,
      grade: '3rd Year',
      yearLevel: '3rd Year',
      studentNumber: '2024-10882',
      program: 'BS Computer Science',
      college: 'College of Engineering',
      phone: '+63 917 555 0142',
      healthFlags: JSON.stringify([]),
    },
  });

  const staffSeeds = [
    {
      email: 'joshua.jude@ateneo.edu',
      name: 'Joshua Jude',
      department: 'IT Department',
    },
    {
      email: 'patricia.lim@ateneo.edu',
      name: 'Dr. Patricia Lim',
      department: 'Campus Health',
    },
    {
      email: 'angela.cruz@ateneo.edu',
      name: 'Angela Cruz',
      department: 'Student Services',
    },
    {
      email: 'roberto.garcia@ateneo.edu',
      name: 'Roberto Garcia',
      department: "Registrar's Office",
    },
  ] as const;

  const staffUsers: Record<string, { id: string; name: string }> = {};

  for (const staff of staffSeeds) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        name: staff.name,
        role: Role.STAFF,
        department: staff.department,
      },
      create: {
        email: staff.email,
        passwordHash,
        name: staff.name,
        role: Role.STAFF,
        department: staff.department,
        schoolId: school.id,
      },
    });
    staffUsers[staff.department] = { id: user.id, name: user.name };
  }

  for (const seed of TICKET_SEEDS) {
    const assignedStaff = staffUsers[seed.department];
    const assignedStaffUserId = assignedStaff?.id ?? null;
    const assignedTo = assignedStaff?.name ?? seed.assignedTo;

    await prisma.ticket.upsert({
      where: { ticketNumber: seed.ticketNumber },
      update: {
        concern: seed.concern,
        title: seed.title,
        status: seed.status,
        urgency: seed.urgency,
        department: seed.department,
        assignedStaffUserId,
        assignedTo,
        confirmation: seed.confirmation,
        deadline: seed.deadline,
        estResolution: seed.estResolution,
        scheduledDate: seed.scheduledDate,
        detailPayload: JSON.stringify(seed.detailPayload),
        updatedAt: seed.updatedAt,
      },
      create: {
        ticketNumber: seed.ticketNumber,
        concern: seed.concern,
        title: seed.title,
        status: seed.status,
        urgency: seed.urgency,
        department: seed.department,
        schoolId: school.id,
        studentUserId: studentUser.id,
        assignedStaffUserId,
        assignedTo,
        confirmation: seed.confirmation,
        deadline: seed.deadline,
        estResolution: seed.estResolution,
        scheduledDate: seed.scheduledDate,
        detailPayload: JSON.stringify(seed.detailPayload),
        createdAt: seed.createdAt,
        updatedAt: seed.updatedAt,
      },
    });
  }

  await prisma.studentHold.deleteMany({
    where: { studentUserId: studentUser.id },
  });

  await prisma.studentHold.createMany({
    data: [
      {
        schoolId: school.id,
        studentUserId: studentUser.id,
        title: 'Tuition hold',
        description: '₱18,400 unpaid',
        department: 'Cashier Office',
      },
      {
        schoolId: school.id,
        studentUserId: studentUser.id,
        title: 'Missing ID photo',
        description: 'Registrar hold',
        department: "Registrar's Office",
      },
    ],
  });

  await prisma.appointmentSlot.deleteMany({
    where: { schoolId: school.id },
  });

  await prisma.appointmentSlot.createMany({
    data: APPOINTMENT_SLOT_SEEDS.map((entry) => ({
      schoolId: school.id,
      department: entry.department,
      startsAt: entry.startsAt,
    })),
  });

  await prisma.appointment.deleteMany({
    where: { studentUserId: studentUser.id },
  });

  for (const seed of APPOINTMENT_SEEDS) {
    await prisma.appointment.create({
      data: {
        title: seed.title,
        department: seed.department,
        purpose: 'purpose' in seed ? seed.purpose : undefined,
        location: seed.location,
        staffName: 'staffName' in seed ? seed.staffName : undefined,
        status: seed.status,
        urgencyLabel: 'urgencyLabel' in seed ? seed.urgencyLabel : undefined,
        barColor: seed.barColor,
        ticketNumber: 'ticketNumber' in seed ? seed.ticketNumber : undefined,
        schoolId: school.id,
        studentUserId: studentUser.id,
        scheduledAt: seed.scheduledAt,
        deadline: 'deadline' in seed ? seed.deadline : undefined,
        bringItems:
          'bringItems' in seed ? JSON.stringify(seed.bringItems) : undefined,
      },
    });
  }

  const KB_ARTICLES = [
    {
      slug: 'nstp-ch02',
      department: 'Campus Health',
      title: 'How to issue an NSTP medical certificate (Form CH-02)',
      description:
        'Step-by-step guide for processing and countersigning the NSTP clearance medical certificate for enrolled students.',
      category: 'procedures',
      tags: JSON.stringify(['Campus Health', 'AI-referenced', 'Form CH-02']),
      viewCount: 142,
      aiReferenced: true,
      readMinutes: 3,
      content: JSON.stringify({
        overview: [
          'This guide covers the end-to-end process for issuing an NSTP medical certificate to a student using Form CH-02. This certificate is required by the NSTP office as part of the semester clearance submission.',
          'Applicable to: All enrolled students enrolled in NSTP 1 or NSTP 2 who require a medical clearance for their section coordinator.',
        ],
        requirements: [
          "Student's valid school ID",
          'NSTP enrollment form or COR showing NSTP subject',
          'Printed appointment confirmation (or digital)',
          'Blank Form CH-02 prepared by staff',
        ],
        steps: [
          {
            text: 'Verify student identity using school ID. Cross-check with the Campus360 ticket details.',
            tag: 'auto-populated by AI',
          },
          { text: 'Check BluePHR for any prior health flags or medical history relevant to NSTP participation.' },
          {
            text: 'Conduct basic vitals check: blood pressure, weight, height, and temperature. Record in BluePHR.',
          },
          {
            text: 'Fill in Form CH-02 with student details, vitals, and certification statement. Use block letters.',
          },
          { text: 'Sign and countersign the certificate. Apply the Campus Health office dry seal.' },
          { text: "Scan and upload signed certificate to BluePHR under the student's record.", tag: 'required' },
          {
            text: 'Mark the Campus360 ticket as Resolved and add a brief staff note in the notes field.',
          },
        ],
        note: 'Form CH-02 must be countersigned by the Campus Health Officer-in-Charge or the assigned physician. Student signature alone is not sufficient for NSTP submission. Do not release the certificate without the office dry seal.',
        relatedIds: ['bluephr-upload', 'reschedule-policy', 'mental-health-ojt'],
      }),
    },
    {
      slug: 'bluephr-upload',
      department: 'Campus Health',
      title: 'BluePHR upload guide for signed documents',
      description:
        'How to upload countersigned certificates and health records into the BluePHR system after a student visit.',
      category: 'procedures',
      tags: JSON.stringify(['Campus Health', 'AI-referenced', 'Integration']),
      viewCount: 98,
      aiReferenced: true,
      readMinutes: 2,
      content: JSON.stringify({
        overview: [
          'After issuing a signed certificate or health document, staff must upload a scanned copy to BluePHR so the student record stays complete and accessible to other departments.',
        ],
        steps: [
          { text: 'Scan the signed document at 300 DPI minimum. Save as PDF.' },
          { text: 'Open BluePHR and search for the student by ID or name.' },
          { text: 'Navigate to Documents → Upload new record.' },
          { text: 'Select document type (e.g. Medical Certificate) and attach the PDF.' },
          { text: 'Add visit date and staff initials, then submit.' },
        ],
        relatedIds: ['nstp-ch02', 'reschedule-policy'],
      }),
    },
    {
      slug: 'reschedule-policy',
      department: 'Campus Health',
      title: 'Appointment rescheduling and cancellation policy',
      description:
        'Rules governing student appointment cancellations, no-shows, and rebooking procedures for Campus Health.',
      category: 'policies',
      tags: JSON.stringify(['Campus Health', 'Policy']),
      viewCount: 74,
      aiReferenced: false,
      readMinutes: 1,
      content: JSON.stringify({
        overview: [
          'Students may reschedule or cancel Campus Health appointments through Campus360 or by contacting the office directly. This policy defines staff responsibilities and no-show handling.',
        ],
        steps: [
          { text: 'Cancellations made 24+ hours before the slot may be rebooked without penalty.' },
          { text: 'Same-day cancellations require staff approval and a documented reason.' },
          { text: 'No-shows are flagged in the student record and may affect future auto-scheduling.' },
        ],
        note: 'For urgent sick-leave cases, staff may override scheduling rules and book same-day slots at their discretion.',
        relatedIds: ['nstp-ch02', 'bluephr-upload'],
      }),
    },
    {
      slug: 'immunization-verify',
      department: 'Campus Health',
      title: 'Immunization record verification — required vaccines list',
      description:
        'List of required vaccines for enrollment and how to flag and escalate missing immunization records.',
      category: 'procedures',
      tags: JSON.stringify(['Campus Health', 'Procedures']),
      viewCount: 61,
      aiReferenced: false,
      readMinutes: 4,
      content: JSON.stringify({
        overview: [
          'All enrolled students must have complete immunization records on file. This article lists required vaccines and the escalation path when records are missing.',
        ],
        requirements: [
          'Meningococcal vaccine (within 5 years)',
          'Measles-mumps-rubella (MMR)',
          'Hepatitis B series',
        ],
        steps: [
          { text: 'Check BluePHR immunization tab for each student.' },
          { text: 'If records are missing, request vaccine card or clinic receipt.' },
          { text: 'Verify batch number and administration date.' },
          { text: 'Update BluePHR and clear enrollment hold flags if applicable.' },
        ],
        relatedIds: ['nstp-ch02'],
      }),
    },
    {
      slug: 'mental-health-ojt',
      department: 'Campus Health',
      title: 'Mental health clearance process — OJT and internship',
      description:
        'Procedure for issuing mental health clearance certificates required for off-campus OJT placements.',
      category: 'procedures',
      tags: JSON.stringify(['Campus Health', 'AI-referenced']),
      viewCount: 55,
      aiReferenced: true,
      readMinutes: 3,
      content: JSON.stringify({
        overview: [
          'Students applying for off-campus OJT or internship placements may require a mental health clearance. This procedure covers assessment, documentation, and certificate issuance.',
        ],
        steps: [
          { text: 'Review the OJT clearance checklist before the session.' },
          { text: 'Conduct a brief wellness assessment during the scheduled appointment.' },
          { text: 'Document findings in BluePHR using the OJT clearance form.' },
          { text: 'Issue clearance certificate and notify the student via Campus360.' },
        ],
        relatedIds: ['reschedule-policy', 'bluephr-upload'],
      }),
    },
    {
      slug: 'annual-pe',
      department: 'Campus Health',
      title: 'Annual physical examination — PE clearance procedure',
      description:
        'Guide for conducting and documenting the annual PE required for continuing students each semester.',
      category: 'procedures',
      tags: JSON.stringify(['Campus Health', 'Procedures']),
      viewCount: 49,
      aiReferenced: false,
      readMinutes: 5,
      content: JSON.stringify({
        overview: [
          'Continuing students must complete an annual physical examination each academic year. This guide covers vitals, examination items, and PE clearance sign-off.',
        ],
        steps: [
          { text: 'Verify student identity and enrollment status.' },
          { text: 'Record vitals and complete standard PE examination items.' },
          { text: 'Obtain physician sign-off on the clearance form.' },
          { text: 'Upload results to BluePHR and mark the ticket resolved.' },
        ],
        relatedIds: ['bluephr-upload'],
      }),
    },
  ] as const;

  await prisma.knowledgeBaseArticle.deleteMany({
    where: { schoolId: school.id },
  });

  for (const article of KB_ARTICLES) {
    await prisma.knowledgeBaseArticle.upsert({
      where: { slug: article.slug },
      update: {
        department: article.department,
        title: article.title,
        description: article.description,
        category: article.category,
        tags: article.tags,
        content: article.content,
        viewCount: article.viewCount,
        aiReferenced: article.aiReferenced,
        readMinutes: article.readMinutes,
      },
      create: {
        slug: article.slug,
        schoolId: school.id,
        department: article.department,
        title: article.title,
        description: article.description,
        category: article.category,
        tags: article.tags,
        content: article.content,
        viewCount: article.viewCount,
        aiReferenced: article.aiReferenced,
        readMinutes: article.readMinutes,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Student: alex.johnson@university.edu / campus360');
  console.log('Staff IT:      joshua.jude@ateneo.edu / campus360');
  console.log('Staff Health:  patricia.lim@ateneo.edu / campus360');
  console.log('Staff Student: angela.cruz@ateneo.edu / campus360');
  console.log("Staff Registrar: roberto.garcia@ateneo.edu / campus360");
  console.log(`Tickets: ${TICKET_SEEDS.length} seeded for Alex Johnson`);
  console.log(`Appointments: ${APPOINTMENT_SEEDS.length} seeded for Alex Johnson`);
  console.log(`Appointment slots: ${APPOINTMENT_SLOT_SEEDS.length} seeded for school`);
  console.log(`Knowledge base: ${KB_ARTICLES.length} articles seeded`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
