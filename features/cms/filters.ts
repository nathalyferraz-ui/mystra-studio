import type { Prisma } from "@/generated/prisma/client";
import { cmsModules, type CmsModule } from "./config";
export type SearchParams = Record<string, string | string[] | undefined>;
export function searchOptions(params: SearchParams, section: CmsModule, admin = false) {
  const get = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const page = Math.max(1, Math.min(100000, Number.parseInt(get("page")) || 1));
  const q = get("q").trim().slice(0, 150);
  const where: Prisma.ContentWhereInput = {
    kind: cmsModules[section].kind,
    ...(admin ? (section === "portfolio" || section === "blog") && get("status") === "ARCHIVED" ? { status: "DRAFT", body: { path: section === "blog" ? ["attrs", "archived"] : ["archived"], equals: true } } : ["DRAFT", "PUBLISHED"].includes(get("status")) ? { status: get("status") as "DRAFT" | "PUBLISHED" } : {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
    ...(q ? section === "servicos" ? {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { category: { is: { name: { contains: q, mode: "insensitive" } } } },
        { technologies: { some: { name: { contains: q, mode: "insensitive" } } } },
      ],
    } : section === "blog" ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }, { tags: { some: { name: { contains: q, mode: "insensitive" } } } }] } : { title: { contains: q, mode: "insensitive" } } : {}),
    ...(get("category") ? { categoryId: get("category").slice(0, 100) } : {}),
    ...(section === "portfolio" && get("technology") ? { technologies: { some: { id: get("technology").slice(0, 100) } } } : {}),
    ...(section === "blog" && get("tag") ? { tags: { some: { slug: get("tag").slice(0, 150) } } } : {}),
  };
  const sorts: Record<string, Prisma.ContentOrderByWithRelationInput[]> = {
    title: [{ title: "asc" }, { id: "asc" }], oldest: [section === "blog" && !admin ? { publishedAt: "asc" } : { createdAt: "asc" }, { id: "asc" }],
    order: [{ sortOrder: "asc" }, { id: "asc" }], updated: [{ updatedAt: "desc" }, { id: "asc" }],
    newest: [{ publishedAt: "desc" }, { id: "asc" }],
  };
  return { page, q, where, orderBy: Object.hasOwn(sorts, get("sort")) ? sorts[get("sort")] : sorts[admin ? "updated" : section === "blog" ? "newest" : "order"] };
}
