import { eventsReady } from "@/features/events/availability";
import { getDb } from "@/lib/db";
import { storageConfigured } from "@/lib/storage";
import { Button, Input, EmptyState } from "@/components/ui";
import { Pagination } from "@/features/cms/list-controls";
import type { SearchParams } from "@/features/cms/queries";
import { MediaUpload, MediaCard } from "./library";
import { institutionalMediaCounts } from "@/features/institutional/queries";
export async function MediaLibrary({ params }: { params: SearchParams }) {
  const q = typeof params.q === "string" ? params.q.slice(0, 150) : "";
  const db = getDb();
  const where = q ? { name: { contains: q, mode: "insensitive" as const } } : {};
  const total = await db.media.count({ where });
  const pages = Math.max(1, Math.ceil(total / 24));
  const page = Math.min(pages, Math.max(1, Number.parseInt(String(params.page)) || 1));
  const media = await db.media.findMany({ where, include: { _count: { select: { covers: true, links: true } } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 24, skip: (page - 1) * 24 });
  const eventReferences = new Map<string, number>();
  const institutionalReferences = await institutionalMediaCounts();
  if (await eventsReady()) {
    const ids = media.map(m => m.id);
    const [covers, gallery, photos] = await Promise.all([db.event.groupBy({ by: ["coverId"], where: { coverId: { in: ids } }, _count: { _all: true } }), db.eventMedia.groupBy({ by: ["mediaId"], where: { mediaId: { in: ids } }, _count: { _all: true } }), db.speaker.groupBy({ by: ["photoId"], where: { photoId: { in: ids } }, _count: { _all: true } })]);
    for (const item of [...covers.map(i => ({ id: i.coverId, count: i._count._all })), ...gallery.map(i => ({ id: i.mediaId, count: i._count._all })), ...photos.map(i => ({ id: i.photoId, count: i._count._all }))]) if (item.id) eventReferences.set(item.id, (eventReferences.get(item.id) || 0) + item.count);
  }
  return <><div className="admin-page-heading"><div><span className="eyebrow">BIBLIOTECA</span><h1>Mídias</h1><p>Imagens privadas, acessíveis publicamente apenas quando vinculadas a conteúdos publicados.</p></div></div><MediaUpload configured={storageConfigured()} /><form className="list-controls" method="get"><label>Buscar por nome<Input name="q" defaultValue={q} maxLength={150} /></label><Button type="submit">Buscar</Button></form>{media.length ? <div className="media-grid">{media.map(item => <MediaCard key={item.id} item={{ id: item.id, name: item.name, alt: item.alt, width: item.width, height: item.height, size: item.size, mimeType: item.mimeType, state: item.state, createdAt: item.createdAt.toISOString(), references: item._count.covers + item._count.links + (eventReferences.get(item.id) || 0) + (institutionalReferences.get(item.id) || 0) }} />)}</div> : <EmptyState label={false} title="Sua biblioteca começa aqui.">Nenhuma imagem encontrada. Envie uma imagem ou ajuste a busca.</EmptyState>}<Pagination page={page} pages={pages} params={params} /></>;
}
