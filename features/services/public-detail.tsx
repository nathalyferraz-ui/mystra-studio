import { getDb } from "@/lib/db";
import { contentInclude, type ContentRecord } from "@/features/cms/queries";
import { ServiceDetail } from "./service-detail";

export async function PublicServiceDetail({ item }: { item: ContentRecord }) {
  const related = await getDb().content.findMany({
    where: {
      kind: "SERVICE", status: "PUBLISHED", publishedAt: { lte: new Date() },
      id: { not: item.id },
      ...(item.categoryId ? { categoryId: item.categoryId } : {}),
    },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
    take: 3,
    include: contentInclude,
  });
  return <ServiceDetail item={item} related={related} />;
}
