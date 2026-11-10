import { getDb } from "@/lib/db";
import { contentInclude, type ContentRecord } from "@/features/cms/queries";
import { ProjectDetail } from "./project-detail";

export async function PublicProjectDetail({ item }: { item: ContentRecord }) {
  const db = getDb();
  const published = { kind: "PROJECT" as const, status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
  const [related, previous, next] = await Promise.all([
    db.content.findMany({ where: { ...published, id: { not: item.id }, ...(item.categoryId ? { categoryId: item.categoryId } : item.technologies.length ? { technologies: { some: { id: { in: item.technologies.map(t => t.id) } } } } : {}) }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { id: "asc" }], take: 3, include: contentInclude }),
    db.content.findFirst({ where: { ...published, OR: [{ sortOrder: { lt: item.sortOrder } }, { sortOrder: item.sortOrder, id: { lt: item.id } }] }, orderBy: [{ sortOrder: "desc" }, { id: "desc" }], select: { slug: true, title: true } }),
    db.content.findFirst({ where: { ...published, OR: [{ sortOrder: { gt: item.sortOrder } }, { sortOrder: item.sortOrder, id: { gt: item.id } }] }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { slug: true, title: true } }),
  ]);
  return <ProjectDetail item={item} related={related} previous={previous} next={next} />;
}
