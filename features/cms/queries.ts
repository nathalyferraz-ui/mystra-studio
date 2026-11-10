import "server-only";
import { getDb } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { cmsModules, type CmsModule } from "./config";
import { searchOptions, type SearchParams } from "./filters";
export type { SearchParams } from "./filters";
export const contentInclude = { category: true, cover: true, author: { select: { id: true, name: true } }, tags: true, technologies: true, mediaLinks: { include: { media: true }, orderBy: { position: "asc" as const } } } satisfies Prisma.ContentInclude;
export type ContentRecord = Prisma.ContentGetPayload<{ include: typeof contentInclude }>;
export async function listContent(section: CmsModule, params: SearchParams, admin = false) {
  const opts = searchOptions(params, section, admin);
  const db = getDb();
  const [total, categories, technologies] = await Promise.all([db.content.count({ where: opts.where }), db.category.findMany({ where: { kind: cmsModules[section].kind, ...(admin ? {} : { contents: { some: { status: "PUBLISHED", publishedAt: { lte: new Date() } } } }) }, orderBy: { name: "asc" } }), section === "portfolio" ? db.technology.findMany({ where: admin ? {} : { contents: { some: { kind: "PROJECT", status: "PUBLISHED", publishedAt: { lte: new Date() } } } }, orderBy: { name: "asc" } }) : Promise.resolve([])]);
  const pages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(opts.page, pages);
  const items = await db.content.findMany({ where: opts.where, orderBy: opts.orderBy, take: 12, skip: (page - 1) * 12, include: contentInclude });
  return { items, total, page, pages, categories, technologies };
}
export async function editOptions(section: CmsModule) {
  const db = getDb();
  const [categories, tags, technologies, media, authors] = await Promise.all([
    db.category.findMany({ where: { kind: cmsModules[section].kind }, orderBy: { name: "asc" } }),
    db.tag.findMany({ orderBy: { name: "asc" } }), db.technology.findMany({ orderBy: { name: "asc" } }),
    db.media.findMany({ where: { state: "READY" }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, alt: true } }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { categories, tags, technologies, media, authors };
}
