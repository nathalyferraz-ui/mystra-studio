import { getDb } from "@/lib/db";
import { contentInclude, type ContentRecord } from "@/features/cms/queries";
import { ArticleDetail } from "./article-detail";
export async function PublicArticleDetail({ item }: { item: ContentRecord }) {
  const related = await getDb().content.findMany({ where: { kind: "ARTICLE", status: "PUBLISHED", publishedAt: { lte: new Date() }, id: { not: item.id }, ...(item.categoryId ? { categoryId: item.categoryId } : item.tags.length ? { tags: { some: { id: { in: item.tags.map(tag => tag.id) } } } } : {}) }, orderBy: [{ publishedAt: "desc" }, { id: "asc" }], take: 3, include: contentInclude });
  return <ArticleDetail item={item} related={related} />;
}
