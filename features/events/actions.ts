"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { sitemapCacheTag } from "@/lib/site-policy";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { idSchema } from "@/features/cms/schema";
import { eventSchema, speakerSchema, eventCategorySchema, registrationStatuses } from "./schema";
import { saveEventRecord, changeRegistrationRecord, deleteEventRecord } from "./repository";
import { eventInputFromRecord } from "./edit-data";
export type EventResult = { ok: boolean; message: string; id?: string; errors?: Record<string, string[]> };
function invalidate() { updateTag(sitemapCacheTag); revalidatePath("/", "layout"); }
function failed(): EventResult { return { ok: false, message: "Operação não confirmada. Verifique os campos, o slug, as referências e a versão atual. Inscrições históricas são preservadas e a capacidade não pode ser menor que a ocupação." }; }
export async function saveEvent(input: unknown): Promise<EventResult> {
  const user = await requireUser(); if (!hasPermission(user, "content:manage")) return { ok: false, message: "Acesso negado." };
  const parsed = eventSchema.safeParse(input); if (!parsed.success) return { ok: false, message: "Revise os campos indicados.", errors: parsed.error.flatten().fieldErrors };
  try { const id = await saveEventRecord(getDb(), parsed.data, user.id); invalidate(); return { ok: true, id, message: "Evento salvo. A disponibilidade pública reflete o status escolhido." }; } catch { return failed(); }
}
export async function eventOperation(raw: unknown): Promise<EventResult> {
  const user = await requireUser(); if (!hasPermission(user, "content:manage")) return failed();
  const parsedOperation = z.object({ id: idSchema, version: z.number().int().positive(), operation: z.enum(["delete", "duplicate", "DRAFT", "PUBLISHED", "CANCELED", "ARCHIVED"]), confirmation: z.string().max(180).optional() }).safeParse(raw);
  if (!parsedOperation.success) return failed(); const input = parsedOperation.data;
  try {
    if (input.operation === "delete") { await deleteEventRecord(getDb(), input.id, input.version, input.confirmation || "", user.id); invalidate(); return { ok: true, message: "Evento sem inscrições excluído. Arquivos da biblioteca preservados." }; }
    const item = await getDb().event.findUniqueOrThrow({ where: { id: input.id, version: input.version }, include: { speakers: { orderBy: { position: "asc" } }, gallery: { orderBy: { position: "asc" } }, schedule: { orderBy: { startsAt: "asc" } } } });
    const data = eventInputFromRecord(item);
    if (input.operation === "duplicate") { delete data.id; delete data.version; data.slug = `${data.slug.slice(0, 130)}-copia-${randomUUID().slice(0, 8)}`; data.title = `${data.title.slice(0, 170)} (cópia)`; data.status = "DRAFT"; data.registrationOpen = false; data.featured = false; }
    else if (["DRAFT", "PUBLISHED", "CANCELED", "ARCHIVED"].includes(input.operation)) { data.status = input.operation as typeof data.status; if (data.status !== "PUBLISHED") data.registrationOpen = false; }
    else return failed();
    const parsed = eventSchema.safeParse(data); if (!parsed.success) return { ok: false, message: "Revise os dados no formulário antes de alterar o estado." };
    const id = await saveEventRecord(getDb(), parsed.data, user.id); invalidate(); return { ok: true, id, message: input.operation === "duplicate" ? "Novo rascunho criado sem copiar inscrições." : "Estado do evento atualizado." };
  } catch { return failed(); }
}
export async function changeEventRegistration(id: string, version: number, status: string): Promise<EventResult> {
  const user = await requireUser(); if (!hasPermission(user, "content:manage") || !idSchema.safeParse(id).success || !Number.isSafeInteger(version) || !Object.hasOwn(registrationStatuses, status)) return failed();
  try { await changeRegistrationRecord(getDb(), id, version, status as keyof typeof registrationStatuses, user.id); invalidate(); return { ok: true, message: "Inscrição atualizada e histórico registrado." }; } catch { return { ok: false, message: "Não foi possível alterar. Recarregue a versão atual e confira a capacidade e o estado do evento." }; }
}
export async function saveEventTaxonomy(kind: "category" | "speaker", input: unknown, remove = false): Promise<EventResult> {
  const user = await requireUser(); if (!hasPermission(user, "content:manage")) return failed();
  try {
    await getDb().$transaction(async tx => {
      if (kind === "category") {
        const data = eventCategorySchema.parse(input); const { id, ...fields } = data;
        if (remove) { if (!id || await tx.event.count({ where: { categoryId: id } })) throw new Error(); await tx.eventCategory.delete({ where: { id, name: fields.name } }); }
        else if (id) await tx.eventCategory.update({ where: { id }, data: fields }); else await tx.eventCategory.create({ data: fields });
      } else if (kind === "speaker") {
        const data = speakerSchema.parse(input); const { id, photoId, ...fields } = data;
        if (remove) { if (!id || await tx.eventSpeaker.count({ where: { speakerId: id } }) || await tx.eventScheduleItem.count({ where: { speakerId: id } })) throw new Error(); await tx.speaker.delete({ where: { id, name: fields.name } }); }
        else {
          if (photoId) { await tx.$queryRaw`SELECT id FROM "Media" WHERE id = ${photoId} FOR UPDATE`; if (!await tx.media.findUnique({ where: { id: photoId, state: "READY" } })) throw new Error(); }
          if (id) await tx.speaker.update({ where: { id }, data: { ...fields, photoId: photoId || null } }); else await tx.speaker.create({ data: { ...fields, photoId: photoId || null } });
        }
      } else throw new Error();
      await tx.adminLog.create({ data: { userId: user.id, action: `event.${kind}.${remove ? "delete" : "save"}` } });
    }); invalidate(); return { ok: true, message: remove ? "Cadastro sem vínculos excluído." : "Cadastro salvo." };
  } catch { return { ok: false, message: "Confira os campos, o slug e a mídia. Cadastros associados a eventos ou programação não podem ser excluídos." }; }
}
