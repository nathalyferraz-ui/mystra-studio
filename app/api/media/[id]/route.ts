import { eventsReady } from "@/features/events/availability";
import { getDb } from "@/lib/db";
import { getStorage } from "@/lib/storage";
import { apiUser } from "@/lib/api-authorization";
import { idSchema } from "@/features/cms/schema";
import { isPublishedInstitutionalMedia } from "@/features/institutional/queries";
import { hasPermission } from "@/lib/permissions";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return new Response(null, { status: 404 });
  try {
    const media = await getDb().media.findUnique({ where: { id, state: "READY" }, include: { covers: { where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { id: true }, take: 1 }, links: { where: { content: { status: "PUBLISHED", publishedAt: { lte: new Date() } } }, select: { contentId: true }, take: 1 } } });
    let eventPublic = false;
    if (media && await eventsReady()) {
      const published = { status: { in: ["PUBLISHED", "CANCELED"] as ("PUBLISHED" | "CANCELED")[] }, publishedAt: { lte: new Date() } };
      eventPublic = !!await getDb().event.count({ where: { ...published, OR: [{ coverId: id }, { gallery: { some: { mediaId: id } } }, { speakers: { some: { speaker: { visible: true, photoId: id } } } }] } });
    }
    if (!media) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    if (!media.covers.length && !media.links.length && !eventPublic && !await isPublishedInstitutionalMedia(id)) {
      const user = await apiUser(request.headers);
      if (!user || !["content:manage", "pages:read", "settings:manage", "institutional:manage"].some(permission => hasPermission(user, permission))) return new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }
    const { client, bucket } = getStorage();
    const file = await client.storage.from(bucket).download(media.storagePath);
    if (file.error) return new Response(null, { status: 503 });
    return new Response(file.data, { headers: { "Content-Type": media.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'", "Content-Disposition": 'inline; filename="image.webp"' } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
