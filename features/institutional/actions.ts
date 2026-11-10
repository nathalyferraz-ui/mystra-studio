"use server";
import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { documentIds } from "./schema";
import { mutateDocument, institutionalCacheTag } from "./repository";
export async function changeInstitutional(raw: unknown) {
  const user = await requireUser();
  const parsed = z.object({ key: z.enum(documentIds), version: z.number().int().min(0), operation: z.enum(["save", "publish", "discard", "restore"]), data: z.unknown().optional(), restoreVersion: z.number().int().positive().optional(), confirmation: z.string().max(120).optional() }).safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Operação inválida." }; const input = parsed.data;
  const permission = input.key === "settings" ? "settings:manage" : input.key === "home" || input.key === "sobre" ? input.operation === "publish" ? "pages:publish" : "pages:update" : "institutional:manage";
  if (!hasPermission(user, permission) || input.data !== undefined && (input.key === "home" || input.key === "sobre") && !hasPermission(user, "pages:update")) return { ok: false, message: "Seu perfil não permite esta operação." };
  if (input.operation === "discard" && input.confirmation !== "DESCARTAR") return { ok: false, message: "Confirme o descarte digitando DESCARTAR." };
  try {
    const state = await mutateDocument(getDb(), input.key, input.version, input.operation, user.id, input.data, input.restoreVersion); updateTag(institutionalCacheTag); revalidatePath("/", "layout");
    return { ok: true, message: input.operation === "publish" ? "Versão publicada. Portal atualizado." : input.operation === "restore" ? "Versão restaurada como novo rascunho. A publicação atual foi preservada." : input.operation === "discard" ? "Alterações não publicadas descartadas." : "Rascunho salvo. O portal continua exibindo a versão publicada.", state };
  } catch (error) { const code = error instanceof Error ? error.message : ""; return { ok: false, message: code === "CONFLICT" ? "Outra pessoa alterou este conteúdo. Recarregue antes de salvar; suas mudanças não foram sobrescritas." : code === "MEDIA_UNAVAILABLE" ? "Uma imagem não está disponível. Reveja a seleção de mídias." : "Não foi possível salvar. Revise os campos e a conexão; nenhum sucesso foi confirmado." }; }
}
