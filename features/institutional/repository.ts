import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { documentSchemas, parseDocument, type DocumentId, type DocumentData, type DocumentState } from "./schema";
import { defaultDocument } from "./defaults";
export const institutionPrefix = "institutional.v1.";
export const institutionalCacheTag = "institutional:published:v1";
export function mediaReferences(value: unknown): string[] {
  const ids = new Set<string>();
  function visit(v: unknown) { if (!v || typeof v !== "object") return; if (Array.isArray(v)) { v.forEach(visit); return; } for (const [k, x] of Object.entries(v)) { if (typeof x === "string" && /(?:imageId|ImageId|logoId|LogoId|faviconId|mediaId)$/.test(k) && x) ids.add(x); else visit(x); } }
  visit(value); return [...ids].sort();
}
export function parseState(key: DocumentId, input: unknown): DocumentState {
  if (!input || typeof input !== "object") throw new Error("INVALID_STATE");
  const s = input as DocumentState;
  if (!Number.isSafeInteger(s.version) || s.version < 1 || !Array.isArray(s.history) || s.history.length > 10 || typeof s.editedBy !== "string" || !Number.isFinite(Date.parse(s.editedAt)) || s.publishedAt !== null && !Number.isFinite(Date.parse(s.publishedAt))) throw new Error("INVALID_STATE");
  return { version: s.version, draft: parseDocument(key, s.draft), published: s.published ? parseDocument(key, s.published) : null, editedBy: s.editedBy, editedAt: s.editedAt, publishedAt: s.publishedAt, history: s.history.map(r => { if (!Number.isSafeInteger(r.version) || !Number.isFinite(Date.parse(r.at)) || typeof r.authorId !== "string") throw new Error("INVALID_REVISION"); return { version: r.version, at: r.at, authorId: r.authorId, data: parseDocument(key, r.data) }; }), mediaIds: mediaReferences([s.draft, s.published, ...s.history.map(r => r.data)]) };
}
export function initialState(key: DocumentId): DocumentState { return { version: 0, draft: defaultDocument(key), published: null, editedBy: "", editedAt: "", publishedAt: null, history: [], mediaIds: [] }; }
export async function readDocument(db: PrismaClient, key: DocumentId) { const row = await db.institutionalSetting.findUnique({ where: { key: `${institutionPrefix}${key}` } }); return row ? parseState(key, row.value) : initialState(key); }
export async function mutateDocument(db: PrismaClient, key: DocumentId, expected: number, operation: "save" | "publish" | "discard" | "restore", authorId: string, data?: unknown, restoreVersion?: number) {
  if (!Object.hasOwn(documentSchemas, key)) throw new Error("INVALID_DOCUMENT");
  return db.$transaction(async tx => {
    // All institutional writes and media deletion share this lock, including first writes.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(548313071)::text AS locked`;
    const row = await tx.institutionalSetting.findUnique({ where: { key: `${institutionPrefix}${key}` } }); const old = row ? parseState(key, row.value) : initialState(key);
    if (old.version !== expected) throw new Error("CONFLICT");
    const now = new Date().toISOString(); let draft: DocumentData = old.draft;
    if (operation === "restore") { const revision = old.history.find(r => r.version === restoreVersion); if (!revision) throw new Error("INVALID_REVISION"); draft = revision.data; }
    else if (operation === "discard") draft = old.published || defaultDocument(key);
    else if (data !== undefined) draft = parseDocument(key, data);
    const next: DocumentState = { ...old, draft, version: old.version + 1, editedBy: authorId, editedAt: now };
    if (operation === "publish") { next.published = draft; next.publishedAt = now; next.history = [{ version: next.version, data: draft, authorId, at: now }, ...old.history].slice(0, 10); }
    next.mediaIds = mediaReferences([next.draft, next.published, ...next.history.map(r => r.data)]);
    if (next.mediaIds.length) {
      const media = await tx.media.findMany({ where: { id: { in: next.mediaIds }, state: "READY" }, select: { id: true } }); if (media.length !== next.mediaIds.length) throw new Error("MEDIA_UNAVAILABLE");
    }
    await tx.institutionalSetting.upsert({ where: { key: `${institutionPrefix}${key}` }, create: { key: `${institutionPrefix}${key}`, value: next as unknown as Prisma.InputJsonValue }, update: { value: next as unknown as Prisma.InputJsonValue } });
    await tx.adminLog.create({ data: { userId: authorId, action: `institutional.${operation}`, resource: key, metadata: { version: next.version, ...(operation === "restore" ? { restoredVersion: restoreVersion } : {}) } } }); return next;
  }, { timeout: 15000 });
}
