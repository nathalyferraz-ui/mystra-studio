"use server";
import { revalidatePath, updateTag } from "next/cache";
import { sitemapCacheTag } from "@/lib/site-policy";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { cmsModules, isCmsModule, type CmsModule } from "./config";
import { contentSchema, idSchema, type ActionResult } from "./schema";
import { persistContent } from "./repository";
import { parseRichDocument } from "./rich-text";
import { parseProjectEditorial } from "@/features/portfolio/editorial";

function failure(error: unknown): ActionResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, message: "Este slug já está em uso neste módulo." };
    if (error.code === "P2025") return { ok: false, message: "Este conteúdo mudou ou foi removido. Recarregue antes de continuar." };
    if (error.code === "P2003") return { ok: false, message: "Uma referência não existe mais. Recarregue suas seleções." };
  }
  return { ok: false, message: "Não foi possível salvar a operação. Verifique as referências, a conexão e tente novamente." };
}
function invalidate(section: CmsModule) {
  updateTag(sitemapCacheTag);
  revalidatePath(`/admin/${section}`); revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function saveContent(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return { ok: false, message: "Seu perfil não permite gerenciar conteúdo." };
  let input: unknown;
  try { const raw = form.get("payload"); if (typeof raw !== "string" || raw.length > 600000) throw new Error(); input = JSON.parse(raw); }
  catch { return { ok: false, message: "Formulário inválido ou muito extenso." }; }
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revise os campos indicados.", errors: parsed.error.flatten().fieldErrors };
  try {
    const id = await persistContent(getDb(), parsed.data, user.id); invalidate(parsed.data.module);
    return { ok: true, message: parsed.data.status === "PUBLISHED" ? "Conteúdo publicado e portal atualizado." : "Rascunho salvo. O conteúdo não está disponível publicamente.", id };
  } catch (error) { return failure(error); }
}
export async function changePublication(section: string, id: string, version: number, publish: boolean): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return { ok: false, message: "Acesso negado." };
  if (!isCmsModule(section) || !idSchema.safeParse(id).success || (!Number.isSafeInteger(version) || version < 1) || typeof publish !== "boolean") return { ok: false, message: "Operação inválida." };
  try {
    const item = await getDb().content.findUniqueOrThrow({ where: { id, kind: cmsModules[section].kind, version }, include: { tags: true, technologies: true, mediaLinks: true } });
    const parsed = contentSchema.safeParse({ ...item, module: section, status: publish ? "PUBLISHED" : "DRAFT", externalUrl: item.externalUrl ?? "", icon: item.icon ?? "", categoryId: item.categoryId ?? "", coverId: item.coverId ?? "", seoTitle: item.seoTitle ?? "", seoDescription: item.seoDescription ?? "", tagIds: item.tags.map(t => t.id), technologyIds: item.technologies.map(t => t.id), galleryIds: item.mediaLinks.filter(m => m.gallery).map(m => m.mediaId) });
    if (!parsed.success) return { ok: false, message: "Preencha o conteúdo obrigatório no formulário antes de publicar." };
    await persistContent(getDb(), parsed.data, user.id); invalidate(section);
    return { ok: true, message: publish ? "Conteúdo publicado." : "Conteúdo despublicado." };
  } catch (error) { return failure(error); }
}
export async function deleteContent(section: string, id: string, version: number, confirmation: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return { ok: false, message: "Acesso negado." };
  if (!isCmsModule(section) || !idSchema.safeParse(id).success || !Number.isSafeInteger(version)) return { ok: false, message: "Operação inválida." };
  try {
    await getDb().$transaction(async tx => {
      const item = await tx.content.findUniqueOrThrow({ where: { id, kind: cmsModules[section].kind, version } });
      if (confirmation !== item.title) throw new Error("Confirmação inválida.");
      await tx.content.delete({ where: { id, version } });
      await tx.adminLog.create({ data: { userId: user.id, action: "content.delete", resource: id, metadata: { kind: item.kind } } });
    });
    invalidate(section); return { ok: true, message: "Conteúdo excluído. Os arquivos da biblioteca foram preservados." };
  } catch (error) { return failure(error); }
}

export async function setProjectArchive(id: string, version: number, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return { ok: false, message: "Acesso negado." };
  if (!idSchema.safeParse(id).success || !Number.isSafeInteger(version) || version < 1 || typeof archived !== "boolean") return { ok: false, message: "Operação inválida." };
  try {
    await getDb().$transaction(async tx => {
      const item = await tx.content.findUniqueOrThrow({ where: { id, kind: "PROJECT", version } });
      const body = { ...parseProjectEditorial(item.body), archived };
      await tx.content.update({ where: { id, version }, data: { body: body as Prisma.InputJsonValue, status: "DRAFT", publishedAt: null, version: { increment: 1 } } });
      await tx.adminLog.create({ data: { userId: user.id, action: archived ? "project.archive" : "project.restore", resource: id } });
    });
    invalidate("portfolio");
    return { ok: true, message: archived ? "Projeto arquivado e retirado do portal." : "Projeto restaurado como rascunho." };
  } catch (error) { return failure(error); }
}

export async function setArticleArchive(id: string, version: number, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return { ok: false, message: "Acesso negado." };
  if (!idSchema.safeParse(id).success || !Number.isSafeInteger(version) || typeof archived !== "boolean") return { ok: false, message: "Operação inválida." };
  try {
    await getDb().$transaction(async tx => {
      const item = await tx.content.findUniqueOrThrow({ where: { id, kind: "ARTICLE", version } });
      const doc = parseRichDocument(item.body);
      const body = { ...doc, attrs: { ...doc.attrs, archived } };
      await tx.content.update({ where: { id, version }, data: { body: body as Prisma.InputJsonValue, status: "DRAFT", publishedAt: null, version: { increment: 1 } } });
      await tx.adminLog.create({ data: { userId: user.id, action: archived ? "article.archive" : "article.restore", resource: id } });
    });
    invalidate("blog"); return { ok: true, message: archived ? "Artigo arquivado e retirado do portal." : "Artigo restaurado como rascunho." };
  } catch (error) { return failure(error); }
}
