-- AlterTable
ALTER TABLE "Student" ADD COLUMN "studentNumber" TEXT;
ALTER TABLE "Student" ADD COLUMN "yearLevel" TEXT;
ALTER TABLE "Student" ADD COLUMN "program" TEXT;
ALTER TABLE "Student" ADD COLUMN "college" TEXT;
ALTER TABLE "Student" ADD COLUMN "phone" TEXT;
ALTER TABLE "Student" ADD COLUMN "healthFlags" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "staffNotes" TEXT;

-- CreateTable
CREATE TABLE "KnowledgeBaseArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "aiReferenced" BOOLEAN NOT NULL DEFAULT false,
    "readMinutes" INTEGER NOT NULL DEFAULT 3,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeBaseArticle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseArticle_slug_key" ON "KnowledgeBaseArticle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_studentNumber_key" ON "Student"("schoolId", "studentNumber");
