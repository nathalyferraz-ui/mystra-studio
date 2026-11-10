"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { permissionCatalog, type PermissionCode } from "./permissions";
import { updateAccount, updateRolePermissions } from "./repository";
async function freshSession() { const session = await getAuth().api.getSession({ headers: await headers() }); const age = session ? Date.now() - new Date(session.session.createdAt).getTime() : NaN; return Number.isFinite(age) && age >= 0 && age < 600000; }
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,191}$/);
const errorResult = (e: unknown) => ({ ok: false, message: e instanceof Error && e.message === "LAST_ADMIN" ? "Operação bloqueada: preserve ao menos outro administrador ativo com acesso por senha." : e instanceof Error && e.message === "CONFLICT" ? "O registro foi alterado. Recarregue para revisar a versão atual." : "Operação recusada. Confira versão, permissões e proteção da própria conta." });
export async function changeAccount(raw: unknown) {
  const user = await requireUser(); if (!hasPermission(user, "users:manage")) return { ok: false, message: "Acesso restrito." };
  const parsed = z.object({ id, version: z.iso.datetime(), operation: z.enum(["activate", "deactivate", "revoke", "roles"]), roles: z.array(z.enum(["ADMIN", "EDITOR", "COMERCIAL"])).min(1).max(3).optional(), confirmed: z.literal(true) }).safeParse(raw); if (!parsed.success) return { ok: false, message: "Revise a confirmação e os campos." };
  if (!await freshSession()) return { ok: false, message: "Saia e entre novamente. Alterações de acesso exigem login iniciado há menos de dez minutos." };
  try { await updateAccount(getDb(), parsed.data, user.id); revalidatePath("/admin", "layout"); return { ok: true, message: "Acesso atualizado e sessões revogadas." }; } catch (e) { return errorResult(e); }
}
export async function changeRolePermissions(raw: unknown) {
  const user = await requireUser(); if (!user.roles.some(r => r.role.code === "ADMIN")) return { ok: false, message: "Somente ADMIN pode alterar permissões de perfis." };
  const codes = Object.keys(permissionCatalog) as [PermissionCode, ...PermissionCode[]]; const parsed = z.object({ roleId: id, version: z.string().regex(/^[a-f0-9]{64}$/), permissions: z.array(z.enum(codes)).max(codes.length), confirmed: z.literal(true) }).safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Permissões ou confirmação inválidas." }; if (!await freshSession()) return { ok: false, message: "Entre novamente para confirmar alterações de permissões com uma sessão recente." };
  try { await updateRolePermissions(getDb(), parsed.data, user.id); revalidatePath("/admin", "layout"); return { ok: true, message: "Permissões do perfil atualizadas. As sessões afetadas foram revogadas." }; } catch (e) { return errorResult(e); }
}
