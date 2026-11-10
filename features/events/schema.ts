import { z } from "zod";
import { idSchema, slugSchema } from "@/features/cms/schema";
import { validTimezone, zonedInstant } from "./time";
export const eventModes = { ONLINE: "Online", PRESENCIAL: "Presencial", HIBRIDO: "Híbrido" } as const;
export const eventStatuses = { DRAFT: "Rascunho", PUBLISHED: "Publicado", CANCELED: "Cancelado", ARCHIVED: "Arquivado" } as const;
export const registrationStatuses = { RECEBIDA: "Recebida", CONFIRMADA: "Confirmada", CANCELADA: "Cancelada" } as const;
const text = (max: number) => z.string().trim().max(max);
const optionalId = idSchema.or(z.literal(""));
export const eventSchema = z.object({
  id: idSchema.optional(), version: z.number().int().positive().optional(), title: text(180).min(3), slug: slugSchema, summary: text(500).min(10), description: text(40000).min(20),
  objectives: text(10000), audience: text(10000), topics: z.array(text(300).min(1)).max(30), additionalInfo: text(10000), privateAccess: text(5000),
  startsAt: text(40).min(1), endsAt: text(40).min(1), timezone: text(80).refine(validTimezone, "Fuso inválido. Use um identificador IANA."), mode: z.enum(["ONLINE", "PRESENCIAL", "HIBRIDO"]), location: text(500),
  capacity: z.number().int().min(1).max(1000000).nullable(), registrationOpen: z.boolean(), registrationStartsAt: text(40), registrationEndsAt: text(40), status: z.enum(["DRAFT", "PUBLISHED", "CANCELED", "ARCHIVED"]), featured: z.boolean(),
  categoryId: optionalId, coverId: optionalId, speakerIds: z.array(idSchema).max(30), gallery: z.array(z.object({ mediaId: idSchema, caption: text(300) })).max(30),
  schedule: z.array(z.object({ startsAt: text(40).min(1), title: text(180).min(3), description: text(2000), speakerId: optionalId })).max(100),
  seoTitle: text(70), seoDescription: text(170),
}).superRefine((data, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (data.id && !data.version) issue("version", "Recarregue a versão do evento.");
  if (data.mode !== "ONLINE" && data.location.length < 5) issue("location", "Informe a localização pública para eventos presenciais ou híbridos.");
  if (data.mode === "ONLINE" && data.location) issue("location", "Para eventos online, deixe a localização pública vazia. Use o campo privado para acesso restrito.");
  if (/https?:\/\/|www\./i.test(data.location)) issue("location", "Não informe links de reunião na localização pública.");
  try {
    const start = zonedInstant(data.startsAt, data.timezone), end = zonedInstant(data.endsAt, data.timezone);
    if (end <= start) issue("endsAt", "O término deve ser posterior ao início.");
    const open = data.registrationStartsAt ? zonedInstant(data.registrationStartsAt, data.timezone) : null, close = data.registrationEndsAt ? zonedInstant(data.registrationEndsAt, data.timezone) : null;
    if (open && close && close <= open || open && open >= start || close && close > start) issue("registrationEndsAt", "Revise o período: abertura antes do início e encerramento até o início do evento.");
    for (const item of data.schedule) { const instant = zonedInstant(item.startsAt, data.timezone); if (instant < start || instant >= end) issue("schedule", "A programação precisa estar dentro do horário do evento."); if (item.speakerId && !data.speakerIds.includes(item.speakerId)) issue("schedule", "Associe o palestrante ao evento antes de incluí-lo na programação."); }
  } catch (cause) { issue("startsAt", cause instanceof Error ? cause.message : "Datas inválidas."); }
  if (new Set(data.speakerIds).size !== data.speakerIds.length || new Set(data.gallery.map(g => g.mediaId)).size !== data.gallery.length) issue("gallery", "Remova associações duplicadas.");
});
export type EventInput = z.infer<typeof eventSchema>;
export const speakerSchema = z.object({ id: idSchema.optional(), name: text(120).min(2), specialty: text(180).min(2), biography: text(10000).min(10), professionalUrl: text(2048).refine(value => { if (!value) return true; try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } }, "Use URL HTTPS válida, sem credenciais."), photoId: optionalId, visible: z.boolean() });
export const eventCategorySchema = z.object({ id: idSchema.optional(), name: text(100).min(2), slug: slugSchema, description: text(1500) });
export const eventRegistrationSchema = z.object({ eventId: idSchema, name: text(120).min(3, "Informe seu nome completo."), email: z.email("Confira o e-mail.").max(254).transform(v => v.toLowerCase()), phone: text(30).refine(v => !v || /^[+()\d .-]{7,30}$/.test(v) && v.replace(/\D/g, "").length >= 7, "Confira o telefone."), privacy: z.literal(true, { error: "Confirme a ciência do aviso." }), website: z.literal(""), token: text(300) });
