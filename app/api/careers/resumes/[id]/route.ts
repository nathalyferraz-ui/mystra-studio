import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { canReadApplications } from "@/features/careers/rules";
import { privateCareerStorage } from "@/features/careers/storage";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); if (!canReadApplications(user)) return new Response(null, { status: 403 }); const { id } = await params; if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return new Response(null, { status: 404 });
  try { const app = await getDb().jobApplication.findUnique({ where: { id, deletingAt: null }, select: { id: true, resumePath: true } }); if (!app) return new Response(null, { status: 404 }); const { data, error } = await (await privateCareerStorage()).download(app.resumePath); if (error || !data) return new Response(null, { status: 503 }); await getDb().adminLog.create({ data: { userId: user.id, action: "application.resume.download", resource: app.id } });
    return new Response(data, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="curriculo.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "X-Robots-Tag": "noindex, nofollow" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
