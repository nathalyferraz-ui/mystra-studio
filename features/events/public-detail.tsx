import { cache } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { eventsReady } from "./availability";
import { eventPublicSelect, publicEventWhere } from "./queries";
import { EventDetail } from "./event-detail";
export const publishedEvent = cache(async (slug: string) => { await connection(); if (!await eventsReady()) return null; return getDb().event.findFirst({ where: { ...publicEventWhere(), slug }, select: eventPublicSelect }); });
export async function PublicEventDetail({ slug }: { slug: string }) {
  const item = await publishedEvent(slug); if (!item) notFound();
  const related = item.categoryId ? await getDb().event.findMany({ where: { ...publicEventWhere(), id: { not: item.id }, categoryId: item.categoryId }, select: eventPublicSelect, orderBy: { startsAt: "desc" }, take: 3 }) : [];
  return <EventDetail item={item} related={related} />;
}
