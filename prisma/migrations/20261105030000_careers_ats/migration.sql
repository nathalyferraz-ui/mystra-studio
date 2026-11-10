-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobMode" AS ENUM ('REMOTO', 'PRESENCIAL', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "JobLevel" AS ENUM ('ESTAGIO', 'JUNIOR', 'PLENO', 'SENIOR', 'LIDERANCA');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('RECEBIDA', 'EM_ANALISE', 'TRIAGEM', 'ENTREVISTA', 'AVALIACAO_TECNICA', 'APROVADA', 'REPROVADA', 'DESISTENCIA');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "area" VARCHAR(120) NOT NULL,
    "mode" "JobMode" NOT NULL,
    "level" "JobLevel" NOT NULL,
    "contractType" VARCHAR(100) NOT NULL,
    "location" VARCHAR(250) NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "responsibilities" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "desirable" TEXT NOT NULL DEFAULT '',
    "benefits" TEXT NOT NULL DEFAULT '',
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "keepClosedPublic" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMPTZ(3),
    "deadline" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seoTitle" VARCHAR(70) NOT NULL DEFAULT '',
    "seoDescription" VARCHAR(170) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(30) NOT NULL DEFAULT '',
    "cityState" VARCHAR(160) NOT NULL DEFAULT '',
    "linkedin" VARCHAR(2048) NOT NULL DEFAULT '',
    "portfolio" VARCHAR(2048) NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "resumePath" TEXT NOT NULL,
    "resumeName" VARCHAR(180) NOT NULL,
    "resumeSize" INTEGER NOT NULL,
    "resumeHash" VARCHAR(64) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'RECEBIDA',
    "assigneeId" VARCHAR(191),
    "privacyVersion" VARCHAR(40) NOT NULL,
    "privacyAcknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retentionUntil" TIMESTAMP(3) NOT NULL,
    "synthetic" BOOLEAN NOT NULL DEFAULT false,
    "deletingAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorId" VARCHAR(191) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationActivity" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" VARCHAR(191),
    "type" VARCHAR(40) NOT NULL,
    "previousValue" VARCHAR(191),
    "nextValue" VARCHAR(191),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobActivity" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "userId" VARCHAR(191),
    "type" VARCHAR(40) NOT NULL,
    "previousStatus" "JobStatus",
    "nextStatus" "JobStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_slug_key" ON "Job"("slug");

-- CreateIndex
CREATE INDEX "Job_status_publishedAt_idx" ON "Job"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Job_area_status_idx" ON "Job"("area", "status");

-- CreateIndex
CREATE INDEX "Job_mode_level_idx" ON "Job"("mode", "level");

-- CreateIndex
CREATE INDEX "Job_deadline_idx" ON "Job"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_resumePath_key" ON "JobApplication"("resumePath");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_status_createdAt_idx" ON "JobApplication"("jobId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_status_createdAt_idx" ON "JobApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_assigneeId_createdAt_idx" ON "JobApplication"("assigneeId", "createdAt");

-- CreateIndex
CREATE INDEX "JobApplication_retentionUntil_idx" ON "JobApplication"("retentionUntil");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_email_key" ON "JobApplication"("jobId", "email");

-- CreateIndex
CREATE INDEX "ApplicationNote_applicationId_createdAt_idx" ON "ApplicationNote"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationNote_authorId_idx" ON "ApplicationNote"("authorId");

-- CreateIndex
CREATE INDEX "ApplicationActivity_applicationId_createdAt_idx" ON "ApplicationActivity"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationActivity_userId_idx" ON "ApplicationActivity"("userId");

-- CreateIndex
CREATE INDEX "JobActivity_jobId_createdAt_idx" ON "JobActivity"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "JobActivity_userId_idx" ON "JobActivity"("userId");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationNote" ADD CONSTRAINT "ApplicationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationActivity" ADD CONSTRAINT "ApplicationActivity_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationActivity" ADD CONSTRAINT "ApplicationActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Job" ADD CONSTRAINT "Job_deadline_check" CHECK (deadline IS NULL OR "publishedAt" IS NULL OR deadline > "publishedAt"), ADD CONSTRAINT "Job_published_check" CHECK (status <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_email_check" CHECK (email = lower(email)), ADD CONSTRAINT "JobApplication_resume_size_check" CHECK ("resumeSize" > 0 AND "resumeSize" <= 10485760), ADD CONSTRAINT "JobApplication_retention_check" CHECK ("retentionUntil" >= "createdAt");
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicationNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicationActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobActivity" ENABLE ROW LEVEL SECURITY;
INSERT INTO "Permission" (id,code,name) VALUES ('mystra-permission-recruitment-manage','recruitment:manage','Gerenciar candidaturas e currículos') ON CONFLICT (code) DO NOTHING;
