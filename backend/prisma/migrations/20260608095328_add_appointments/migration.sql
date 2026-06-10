-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "purpose" TEXT,
    "location" TEXT,
    "staffName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "urgencyLabel" TEXT,
    "barColor" TEXT NOT NULL DEFAULT '#2E5BA8',
    "schoolId" TEXT NOT NULL,
    "studentUserId" TEXT NOT NULL,
    "ticketNumber" TEXT,
    "scheduledAt" DATETIME NOT NULL,
    "deadline" DATETIME,
    "bringItems" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
