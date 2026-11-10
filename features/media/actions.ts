"use server";
import { eventsReady } from "@/features/events/availability";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { idSchema, type ActionResult } from "@/features/cms/schema";
import { institutionPrefix, mediaReferences } from "@/features/institutional/repository";
function invalidate() { revalidatePath("/admin/midias"); revalidatePath("/", "layout"); }
export async function updateMedia(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return { ok: false, message: "Acesso negado." };
  const parsed = z.object({ id: idSchema, name: z.string().trim().min(1).max(180), alt: z.string().trim().min(1).max(300) }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Informe nome e descrição alternativa válidos." };
  try {
    const { id, ...data } = parsed.data;
    await getDb().$transaction(async tx => { await tx.media.update({ where: { id, state: "READY" }, data }); await tx.adminLog.create({ data: { userId: user.id, action: "media.update", resource: id } }); });
    invalidate(); return { ok: true, message: "Metadados atualizados." };
  } catch { return { ok: false, message: "Não foi possível atualizar esta mídia." }; }
}
export async function deleteMedia(id: string, confirmation: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage") || !idSchema.safeParse(id).success) return { ok: false, message: "Acesso negado ou mídia inválida." };
  const db = getDb();
  let media;
  try {
    media = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(548313071)::text AS locked`;
      await tx.$queryRaw`SELECT id FROM "Media" WHERE id = ${id} FOR UPDATE`;
      const item = await tx.media.findUniqueOrThrow({ where: { id }, include: { _count: { select: { covers: true, links: true } } } });
      if (confirmation !== item.name) return null;
      if (item._count.covers || item._count.links) return null;
      const institutional = await tx.institutionalSetting.findMany({ where: { key: { startsWith: institutionPrefix } }, select: { value: true } });
      if (institutional.some(row => mediaReferences(row.value).includes(id))) return null;
      if (await eventsReady() && (await tx.event.count({ where: { OR: [{ coverId: id }, { gallery: { some: { mediaId: id } } }] } }) || await tx.speaker.count({ where: { photoId: id } }))) return null;
      return tx.media.update({ where: { id }, data: { state: "DELETING" } });
    });
    if (!media) return { ok: false, message: "Confirme o nome e remova todas as referências antes de excluir, inclusive de rascunhos." };
    const { client, bucket } = getStorage();
    const result = await client.storage.from(bucket).remove([media.storagePath]);
    if (result.error) { await db.media.update({ where: { id }, data: { state: "READY" } }); return { ok: false, message: "O armazenamento não confirmou a exclusão. Tente novamente." }; }
    await db.$transaction(async tx => { await tx.media.delete({ where: { id, state: "DELETING" } }); await tx.adminLog.create({ data: { userId: user.id, action: "media.delete", resource: id } }); });
    invalidate(); return { ok: true, message: "Imagem e metadados excluídos." };
  } catch {
    // A DELETING row remains retryable if storage succeeded but the database failed.
    invalidate(); return { ok: false, message: "Exclusão não concluída. Verifique a conexão e tente novamente; arquivos em remoção não podem ser selecionados." };
  }
}
