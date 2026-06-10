-- CreateTable
CREATE TABLE "AppointmentSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentSlot_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AppointmentSlot_schoolId_department_startsAt_idx" ON "AppointmentSlot"("schoolId", "department", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentSlot_schoolId_department_startsAt_key" ON "AppointmentSlot"("schoolId", "department", "startsAt");
