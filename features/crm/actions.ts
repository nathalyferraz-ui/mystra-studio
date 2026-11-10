"use server";
import { revalidatePath } from "next/cache";
import { updateLeadRecord } from "./persistence";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { updateLeadSchema, type LeadResult } from "./schema";
export async function updateLead(input: unknown): Promise<LeadResult> {
  const user = await requireUser();
  if (!hasPermission(user, "requests:manage")) return { ok: false, message: "Acesso negado." };
  const parsed = updateLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise os campos. Observações têm até 5000 caracteres." };
  const data = parsed.data;
  try {
    await updateLeadRecord(getDb(), data, user.id);
    revalidatePath("/admin"); revalidatePath("/admin/leads"); revalidatePath(`/admin/leads/${data.id}`);
    return { ok: true, message: "Acompanhamento salvo." };
  } catch { return { ok: false, message: "Não foi possível salvar. O registro pode ter sido alterado por outra pessoa. Recarregue e tente novamente." }; }
}
