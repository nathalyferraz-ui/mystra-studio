import { Prisma, type PrismaClient, type EventRegistrationStatus } from "@/generated/prisma/client";
import { zonedInstant } from "./time";
import { registrationAvailability } from "./rules";
import type { EventInput } from "./schema";
export const occupiedStatuses: EventRegistrationStatus[] = ["RECEBIDA", "CONFIRMADA"];
async function lockMedia(tx: Prisma.TransactionClient, ids: string[]) {
  const unique = [...new Set(ids)].sort(); if (!unique.length) return;
  const rows = await tx.$queryRaw<{ id: string; state: string }[]>(Prisma.sql`SELECT id, state FROM "Media" WHERE id IN (${Prisma.join(unique)}) ORDER BY id FOR UPDATE`);
  if (rows.length !== unique.length || rows.some(row => row.state !== "READY")) throw new Error("MEDIA");
}
export async function saveEventRecord(db: PrismaClient, data: EventInput, userId: string) {
  return db.$transaction(async tx => {
    if (data.id) await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${data.id} FOR UPDATE`;
    const old = data.id ? await tx.event.findUniqueOrThrow({ where: { id: data.id, version: data.version } }) : null;
    const occupied = old ? await tx.eventRegistration.count({ where: { eventId: old.id, status: { in: occupiedStatuses } } }) : 0;
    if (data.capacity !== null && data.capacity < occupied) throw new Error("CAPACITY");
    if (data.categoryId && !await tx.eventCategory.findUnique({ where: { id: data.categoryId } })) throw new Error("CATEGORY");
    if (await tx.speaker.count({ where: { id: { in: data.speakerIds } } }) !== data.speakerIds.length) throw new Error("SPEAKERS");
    await lockMedia(tx, [...data.gallery.map(g => g.mediaId), ...(data.coverId ? [data.coverId] : [])]);
    const instant = (value: string) => zonedInstant(value, data.timezone);
    const fields = { title: data.title, slug: data.slug, summary: data.summary, description: data.description, objectives: data.objectives, audience: data.audience, topics: data.topics, additionalInfo: data.additionalInfo, privateAccess: data.privateAccess, startsAt: instant(data.startsAt), endsAt: instant(data.endsAt), timezone: data.timezone, mode: data.mode, location: data.location, capacity: data.capacity, registrationOpen: data.registrationOpen && data.status === "PUBLISHED", registrationStartsAt: data.registrationStartsAt ? instant(data.registrationStartsAt) : null, registrationEndsAt: data.registrationEndsAt ? instant(data.registrationEndsAt) : null, status: data.status, featured: data.featured, seoTitle: data.seoTitle, seoDescription: data.seoDescription, categoryId: data.categoryId || null, coverId: data.coverId || null, publishedAt: data.status === "PUBLISHED" ? old?.publishedAt ?? new Date() : data.status === "CANCELED" ? old?.publishedAt ?? null : null };
    const nested = { speakers: { create: data.speakerIds.map((speakerId, position) => ({ speakerId, position })) }, schedule: { create: data.schedule.map(item => ({ ...item, startsAt: instant(item.startsAt), speakerId: item.speakerId || null })) }, gallery: { create: data.gallery.map((item, position) => ({ ...item, position })) } };
    const item = old ? await tx.event.update({ where: { id: old.id, version: data.version }, data: { ...fields, version: { increment: 1 }, speakers: { deleteMany: {}, ...nested.speakers }, schedule: { deleteMany: {}, ...nested.schedule }, gallery: { deleteMany: {}, ...nested.gallery } } }) : await tx.event.create({ data: { ...fields, ...nested } });
    await tx.adminLog.create({ data: { userId, action: old ? "event.update" : "event.create", resource: item.id, metadata: { status: item.status } } });
    return item.id;
  });
}
export async function registerForEvent(db: PrismaClient, data: { eventId: string; name: string; email: string; phone: string }) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${data.eventId} FOR UPDATE`;
    const event = await tx.event.findUnique({ where: { id: data.eventId } });
    if (!event || !["PUBLISHED", "CANCELED"].includes(event.status) || !event.publishedAt || event.publishedAt > new Date()) return { code: "CLOSED" };
    if (event.status === "CANCELED") return { code: "CANCELED" };
    const existing = await tx.eventRegistration.findUnique({ where: { eventId_email: { eventId: data.eventId, email: data.email } } });
    if (existing) return { code: "EXISTS" };
    const occupied = await tx.eventRegistration.count({ where: { eventId: event.id, status: { in: occupiedStatuses } } });
    const availability = registrationAvailability(event, occupied);
    if (!availability.open) return { code: availability.code };
    await tx.eventRegistration.create({ data: { ...data, privacyVersion: "eventos-2026-11-v1", activities: { create: { action: "RECEBIDA_PORTAL", nextStatus: "RECEBIDA" } } } });
    return { code: "RECEIVED" };
  });
}
export async function changeRegistrationRecord(db: PrismaClient, id: string, version: number, status: EventRegistrationStatus, userId: string) {
  return db.$transaction(async tx => {
    const reference = await tx.eventRegistration.findUniqueOrThrow({ where: { id }, select: { eventId: true } });
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${reference.eventId} FOR UPDATE`;
    const old = await tx.eventRegistration.findUniqueOrThrow({ where: { id, version } });
    if (status === old.status) return;
    const event = await tx.event.findUniqueOrThrow({ where: { id: old.eventId } });
    if (status !== "CANCELADA" && ["CANCELED", "ARCHIVED"].includes(event.status)) throw new Error("CLOSED");
    if (old.status === "CANCELADA" && status !== "CANCELADA") {
      const count = await tx.eventRegistration.count({ where: { eventId: old.eventId, status: { in: occupiedStatuses } } });
      if (event.status !== "PUBLISHED" || event.startsAt <= new Date() || event.capacity !== null && count >= event.capacity) throw new Error("CAPACITY");
    }
    await tx.eventRegistration.update({ where: { id, version }, data: { status, version: { increment: 1 }, activities: { create: { action: "STATUS", userId, previousStatus: old.status, nextStatus: status } } } });
    await tx.adminLog.create({ data: { userId, action: "event.registration.status", resource: id, metadata: { status } } });
  });
}
export async function deleteEventRecord(db: PrismaClient, id: string, version: number, title: string, userId: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${id} FOR UPDATE`;
    const item = await tx.event.findUniqueOrThrow({ where: { id, version } });
    if (item.title !== title || await tx.eventRegistration.count({ where: { eventId: id } })) throw new Error("HISTORY");
    await tx.event.delete({ where: { id, version } }); await tx.adminLog.create({ data: { userId, action: "event.delete", resource: id } });
  });
}
