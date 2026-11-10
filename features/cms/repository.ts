import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { cmsModules } from "./config";
import type { ContentInput } from "./schema";
import { richMediaIds } from "./rich-text";
import { bodyDocument, parseProjectEditorial } from "@/features/portfolio/editorial";

export async function persistContent(db: PrismaClient, data: ContentInput, userId: string) {
  const kind = cmsModules[data.module].kind;
  const gallery = data.module === "portfolio" ? [...new Set(data.galleryIds)] : [];
  const project = data.module === "portfolio" ? parseProjectEditorial(data.body) : null;
  if (project) project.galleryCaptions = Object.fromEntries(Object.entries(project.galleryCaptions).filter(([id]) => gallery.includes(id)));
  const inline = richMediaIds(bodyDocument(data.body));
  const attachments = [...new Set([...gallery, ...inline])];
  const mediaIds = [...new Set([...attachments, ...(data.coverId ? [data.coverId] : [])])].sort();
  return db.$transaction(async tx => {
    if (data.categoryId && !await tx.category.findFirst({ where: { id: data.categoryId, kind } })) throw new Error("Categoria inválida.");
    if (data.authorId && !await tx.user.findFirst({ where: { id: data.authorId, active: true } })) throw new Error("Autor inválido.");
    if (mediaIds.length) {
      const rows = await tx.$queryRaw<{ id: string; state: string }[]>(Prisma.sql`SELECT id, state FROM "Media" WHERE id IN (${Prisma.join(mediaIds)}) ORDER BY id FOR UPDATE`);
      if (rows.length !== mediaIds.length || rows.some(row => row.state !== "READY")) throw new Error("Mídia indisponível.");
    }
    const old = data.id ? await tx.content.findUniqueOrThrow({ where: { id: data.id, kind, version: data.version } }) : null;
    const fields = {
      title: data.title, slug: data.slug, summary: data.summary, description: data.description,
      body: (project ?? data.body) as Prisma.InputJsonValue,
      challenge: kind === "PROJECT" ? data.challenge : "", solution: kind === "PROJECT" ? data.solution : "", results: kind === "PROJECT" ? data.results : "",
      benefits: kind === "SERVICE" ? data.benefits : [], externalUrl: kind === "PROJECT" ? data.externalUrl || null : null, icon: kind === "SERVICE" ? data.icon || null : null,
      status: data.status, featured: data.featured, sortOrder: data.sortOrder,
      seoTitle: data.seoTitle || null, seoDescription: data.seoDescription || null,
      categoryId: data.categoryId || null, authorId: data.authorId ?? old?.authorId ?? userId, coverId: data.coverId || null,
      publishedAt: data.status === "PUBLISHED" ? old?.publishedAt ?? new Date() : null,
    };
    const tags = kind === "ARTICLE" ? [...new Set(data.tagIds)].map(id => ({ id })) : [];
    const technologies = kind !== "ARTICLE" ? [...new Set(data.technologyIds)].map(id => ({ id })) : [];
    const links = attachments.map((mediaId, position) => ({ mediaId, position, gallery: gallery.includes(mediaId) }));
    const saved = old ? await tx.content.update({ where: { id: old.id, version: data.version }, data: { ...fields, version: { increment: 1 }, tags: { set: tags }, technologies: { set: technologies }, mediaLinks: { deleteMany: {}, create: links } } }) : await tx.content.create({ data: { ...fields, kind, tags: { connect: tags }, technologies: { connect: technologies }, mediaLinks: { create: links } } });
    await tx.adminLog.create({ data: { userId, action: old ? "content.update" : "content.create", resource: saved.id, metadata: { kind, status: saved.status } } });
    return saved.id;
  });
}
