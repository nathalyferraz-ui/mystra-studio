"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { idSchema, slugSchema, type ActionResult } from "@/features/cms/schema";
const taxonomySchema = z.object({ id: idSchema.optional(), entity: z.enum(["SERVICE", "PROJECT", "ARTICLE", "TAG", "TECHNOLOGY"]), name: z.string().trim().min(2).max(100), slug: slugSchema, description: z.string().trim().max(1500).default("") });
export async function mutateTaxonomy(input: unknown, remove = false): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return { ok: false, message: "Acesso negado." };
  const parsed = taxonomySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise nome, slug e descrição (até 1500 caracteres)." };
  const { id, entity, name, slug, description } = parsed.data;
  try {
    await getDb().$transaction(async tx => {
      const fields = { name, slug }; let savedId = id;
      if (remove) {
        if (!id) throw new Error();
        // Serialize deletion with foreign-key checks performed by concurrent content writes.
        if (entity === "TAG") await tx.$queryRaw`SELECT id FROM "Tag" WHERE id = ${id} FOR UPDATE`;
        else if (entity === "TECHNOLOGY") await tx.$queryRaw`SELECT id FROM "Technology" WHERE id = ${id} FOR UPDATE`;
        else await tx.$queryRaw`SELECT id FROM "Category" WHERE id = ${id} FOR UPDATE`;
        const count = await tx.content.count({ where: entity === "TAG" ? { tags: { some: { id } } } : entity === "TECHNOLOGY" ? { technologies: { some: { id } } } : { categoryId: id } });
        if (count) throw new Error("Em uso.");
        if (entity === "TAG") await tx.tag.delete({ where: { id, name } });
        else if (entity === "TECHNOLOGY") await tx.technology.delete({ where: { id, name } });
        else await tx.category.delete({ where: { id, kind: entity, name } });
        await tx.institutionalSetting.deleteMany({ where: { key: `taxonomy.${entity}.${id}` } });
      } else {
        if (entity === "TAG") savedId = (id ? await tx.tag.update({ where: { id }, data: fields }) : await tx.tag.create({ data: fields })).id;
        else if (entity === "TECHNOLOGY") savedId = (id ? await tx.technology.update({ where: { id }, data: fields }) : await tx.technology.create({ data: fields })).id;
        else savedId = (id ? await tx.category.update({ where: { id, kind: entity }, data: fields }) : await tx.category.create({ data: { ...fields, kind: entity } })).id;
        const key = `taxonomy.${entity}.${savedId}`;
        await tx.institutionalSetting.upsert({ where: { key }, create: { key, value: { description } }, update: { value: { description } } });
      }
      await tx.adminLog.create({ data: { userId: user.id, action: remove ? "taxonomy.delete" : "taxonomy.save", resource: savedId, metadata: { entity, slug } } });
    });
    revalidatePath("/", "layout"); return { ok: true, message: remove ? "Marcador excluído." : "Marcador e descrição salvos." };
  } catch { return { ok: false, message: remove ? "Não foi possível excluir. Remova as referências e confira a confirmação." : "Não foi possível salvar. Verifique se o slug já existe e tente novamente." }; }
}
