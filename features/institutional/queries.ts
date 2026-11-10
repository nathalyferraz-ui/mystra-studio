import "server-only";
import { cache } from "react";
import { cacheTag, cacheLife } from "next/cache";
import { getDb } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { documentIds, parseDocument, type DocumentId, type DocumentData, type PageDocument, type SiteSettings } from "./schema";
import { defaultDocument } from "./defaults";
import { institutionPrefix, institutionalCacheTag, parseState } from "./repository";
import { publicInstitutionalMediaIds } from "./public-media";
async function cachedPublishedDocuments() {
  "use cache";
  cacheTag(institutionalCacheTag);
  cacheLife({ stale: 30, revalidate: 300, expire: 3600 });
  const documents: [DocumentId, DocumentData][] = [];
  try { const rows = await getDb().$queryRaw<{ key: string; published: unknown }[]>(Prisma.sql`SELECT key, value->'published' AS published FROM "InstitutionalSetting" WHERE key IN (${Prisma.join(documentIds.map(k => `${institutionPrefix}${k}`))})`);
    for (const row of rows) { const key = row.key.slice(institutionPrefix.length) as DocumentId; try { if (row.published) documents.push([key, parseDocument(key, row.published)]); } catch { /* Invalid settings are never rendered or exposed. */ } }
  } catch { /* Public structural defaults do not seed the database. */ }
  return documents;
}
export const publishedDocuments = cache(async () => new Map(await cachedPublishedDocuments()));
export async function publishedPage(page: "home" | "sobre") { return ((await publishedDocuments()).get(page) || defaultDocument(page)) as PageDocument; }
export async function publishedSettings() { return ((await publishedDocuments()).get("settings") || defaultDocument("settings")) as SiteSettings; }
export const institutionalMediaInfo = cache(async (id: string) => getDb().media.findUnique({ where: { id, state: "READY" }, select: { alt: true, width: true, height: true } }));
export async function isPublishedInstitutionalMedia(id: string) { return [...(await publishedDocuments()).entries()].some(([key, doc]) => publicInstitutionalMediaIds(key, doc).includes(id)); }
export async function institutionalMediaCounts() {
  const rows = await getDb().institutionalSetting.findMany({ where: { key: { startsWith: institutionPrefix } }, select: { key: true, value: true } }); const counts = new Map<string, number>();
  for (const row of rows) { const key = row.key.slice(institutionPrefix.length) as DocumentId; if (!documentIds.includes(key)) continue; const state = parseState(key, row.value); for (const id of state.mediaIds) counts.set(id, (counts.get(id) || 0) + 1); } return counts;
}
