-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'PRESENCIAL', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('RECEBIDA', 'CONFIRMADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "description" VARCHAR(1500) NOT NULL DEFAULT '',

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "slug" VARCHAR(150) NOT NULL,
    "summary" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" TEXT NOT NULL DEFAULT '',
    "audience" TEXT NOT NULL DEFAULT '',
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additionalInfo" TEXT NOT NULL DEFAULT '',
    "privateAccess" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "timezone" VARCHAR(80) NOT NULL,
    "mode" "EventMode" NOT NULL,
    "location" VARCHAR(500) NOT NULL DEFAULT '',
    "capacity" INTEGER,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "registrationStartsAt" TIMESTAMPTZ(3),
    "registrationEndsAt" TIMESTAMPTZ(3),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" VARCHAR(70) NOT NULL DEFAULT '',
    "seoDescription" VARCHAR(170) NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "categoryId" TEXT,
    "coverId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Speaker" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "specialty" VARCHAR(180) NOT NULL,
    "biography" TEXT NOT NULL,
    "professionalUrl" VARCHAR(2048) NOT NULL DEFAULT '',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "photoId" TEXT,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSpeaker" (
    "eventId" TEXT NOT NULL,
    "speakerId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventSpeaker_pkey" PRIMARY KEY ("eventId","speakerId")
);

-- CreateTable
CREATE TABLE "EventScheduleItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "speakerId" TEXT,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "description" VARCHAR(2000) NOT NULL DEFAULT '',

    CONSTRAINT "EventScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMedia" (
    "eventId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "caption" VARCHAR(300) NOT NULL DEFAULT '',

    CONSTRAINT "EventMedia_pkey" PRIMARY KEY ("eventId","mediaId")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(30) NOT NULL DEFAULT '',
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'RECEBIDA',
    "privacyVersion" VARCHAR(40) NOT NULL,
    "privacyAcknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistrationActivity" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "userId" VARCHAR(191),
    "action" VARCHAR(40) NOT NULL,
    "previousStatus" "EventRegistrationStatus",
    "nextStatus" "EventRegistrationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistrationActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_slug_key" ON "EventCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_startsAt_idx" ON "Event"("status", "startsAt");

-- CreateIndex
CREATE INDEX "Event_categoryId_startsAt_idx" ON "Event"("categoryId", "startsAt");

-- CreateIndex
CREATE INDEX "Event_mode_startsAt_idx" ON "Event"("mode", "startsAt");

-- CreateIndex
CREATE INDEX "Event_coverId_idx" ON "Event"("coverId");

-- CreateIndex
CREATE INDEX "Speaker_photoId_idx" ON "Speaker"("photoId");

-- CreateIndex
CREATE INDEX "EventSpeaker_speakerId_idx" ON "EventSpeaker"("speakerId");

-- CreateIndex
CREATE INDEX "EventScheduleItem_eventId_startsAt_idx" ON "EventScheduleItem"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "EventScheduleItem_speakerId_idx" ON "EventScheduleItem"("speakerId");

-- CreateIndex
CREATE INDEX "EventMedia_mediaId_idx" ON "EventMedia"("mediaId");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_createdAt_idx" ON "EventRegistration"("eventId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_email_key" ON "EventRegistration"("eventId", "email");

-- CreateIndex
CREATE INDEX "EventRegistrationActivity_registrationId_createdAt_idx" ON "EventRegistrationActivity"("registrationId", "createdAt");

-- CreateIndex
CREATE INDEX "EventRegistrationActivity_userId_idx" ON "EventRegistrationActivity"("userId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Speaker" ADD CONSTRAINT "Speaker_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSpeaker" ADD CONSTRAINT "EventSpeaker_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSpeaker" ADD CONSTRAINT "EventSpeaker_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventScheduleItem" ADD CONSTRAINT "EventScheduleItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventScheduleItem" ADD CONSTRAINT "EventScheduleItem_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistrationActivity" ADD CONSTRAINT "EventRegistrationActivity_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistrationActivity" ADD CONSTRAINT "EventRegistrationActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_dates_check" CHECK ("endsAt" > "startsAt"), ADD CONSTRAINT "Event_capacity_check" CHECK (capacity IS NULL OR capacity > 0), ADD CONSTRAINT "Event_registration_window_check" CHECK (("registrationStartsAt" IS NULL OR "registrationStartsAt" < "startsAt") AND ("registrationEndsAt" IS NULL OR "registrationEndsAt" <= "startsAt") AND ("registrationStartsAt" IS NULL OR "registrationEndsAt" IS NULL OR "registrationEndsAt" > "registrationStartsAt"));
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_email_normalized_check" CHECK (email = lower(email));
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Speaker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventSpeaker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventScheduleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventMedia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventRegistration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventRegistrationActivity" ENABLE ROW LEVEL SECURITY;
