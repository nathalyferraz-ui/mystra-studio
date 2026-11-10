import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import type { SearchParams } from "@/features/cms/filters";
import { eventModes, eventStatuses } from "./schema";
export const publicEventWhere = (): Prisma.EventWhereInput => ({ status: { in: ["PUBLISHED", "CANCELED"] }, publishedAt: { lte: new Date() } });
export const eventPublicSelect = { id: true, title: true, slug: true, summary: true, description: true, objectives: true, audience: true, topics: true, additionalInfo: true, startsAt: true, endsAt: true, timezone: true, mode: true, location: true, capacity: true, registrationOpen: true, registrationStartsAt: true, registrationEndsAt: true, status: true, publishedAt: true, updatedAt: true, seoTitle: true, seoDescription: true, categoryId: true, category: true, cover: { select: { id: true, alt: true, width: true, height: true } }, gallery: { orderBy: { position: "asc" }, select: { caption: true, media: { select: { id: true, alt: true, width: true, height: true } } } }, speakers: { where: { speaker: { visible: true } }, orderBy: { position: "asc" }, select: { speaker: { select: { id: true, name: true, specialty: true, biography: true, professionalUrl: true, photo: { select: { id: true, alt: true } } } } } }, schedule: { orderBy: [{ startsAt: "asc" }, { id: "asc" }], select: { id: true, startsAt: true, title: true, description: true, speakerId: true } }, _count: { select: { registrations: { where: { status: { in: ["RECEBIDA", "CONFIRMADA"] } } } } } } satisfies Prisma.EventSelect;
export type PublicEvent = Prisma.EventGetPayload<{ select: typeof eventPublicSelect }>;
export function eventFilters(params: SearchParams, admin = false) {
  const value = (key: string) => typeof params[key] === "string" ? (params[key] as string).trim().slice(0, 150) : "";
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  const where: Prisma.EventWhereInput = { ...(admin ? Object.hasOwn(eventStatuses, value("status")) ? { status: value("status") as keyof typeof eventStatuses } : {} : publicEventWhere()), ...(value("q") ? { title: { contains: value("q"), mode: "insensitive" } } : {}), ...(value("category") ? { categoryId: value("category") } : {}), ...(Object.hasOwn(eventModes, value("mode")) ? { mode: value("mode") as keyof typeof eventModes } : {}), ...(value("period") === "past" ? { endsAt: { lt: new Date() } } : value("period") === "future" ? { endsAt: { gte: new Date() } } : {}), ...(validDate(value("from")) || validDate(value("to")) ? { startsAt: { ...(validDate(value("from")) ? { gte: new Date(`${value("from")}T00:00:00Z`) } : {}), ...(validDate(value("to")) ? { lt: new Date(Date.parse(`${value("to")}T00:00:00Z`) + 86400000) } : {}) } } : {}) };
  const orderBy: Prisma.EventOrderByWithRelationInput[] = [{ startsAt: value("sort") === "desc" ? "desc" : "asc" }, { id: "asc" }];
  return { where, orderBy, page: Math.max(1, Math.min(100000, parseInt(value("page")) || 1)) };
}
export async function eventOptions() {
  const db = getDb(); const [categories, speakers, media] = await Promise.all([db.eventCategory.findMany({ orderBy: { name: "asc" } }), db.speaker.findMany({ orderBy: { name: "asc" } }), db.media.findMany({ where: { state: "READY" }, select: { id: true, name: true, alt: true }, orderBy: { createdAt: "desc" } })]); return { categories, speakers, media };
}
export type EventOptions = Awaited<ReturnType<typeof eventOptions>>;
