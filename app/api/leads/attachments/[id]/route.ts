import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { privateLeadStorage } from "@/features/crm/attachments";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!hasPermission(user, "requests:manage")) return new Response(null, { status: 403 });
  const { id } = await context.params; if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return new Response(null, { status: 404 });
  try { const item = await getDb().leadAttachment.findUnique({ where: { id } });
    if (!item) return new Response(null, { status: 404 });
    const { data, error } = await (await privateLeadStorage()).download(item.storagePath);
    if (error || !data) return new Response(null, { status: 503 });
    return new Response(data, { headers: { "Content-Type": "image/webp", "Content-Disposition": `attachment; filename="referencia.webp"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch { return new Response(null, { status: 503 }); }
}
