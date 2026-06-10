-- AlterTable
ALTER TABLE "User" ADD COLUMN "department" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "assignedStaffUserId" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_assignedStaffUserId_idx" ON "Ticket"("assignedStaffUserId");
