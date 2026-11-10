import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { csvCell } from "@/features/events/rules";
import { registrationStatuses } from "@/features/events/schema";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); if (!hasPermission(user, "content:manage")) return new Response(null, { status: 403 }); const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) return new Response(null, { status: 404 });
  try { const db = getDb(), event = await db.event.findUnique({ where: { id }, select: { id: true, slug: true } }); if (!event) return new Response(null, { status: 404 });
    const search = new URL(request.url).searchParams, q = (search.get("q") || "").trim().slice(0, 150), state = search.get("status") || "";
    const items = await db.eventRegistration.findMany({ where: { eventId: id, ...(Object.hasOwn(registrationStatuses, state) ? { status: state as keyof typeof registrationStatuses } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}) }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 10001, select: { name: true, email: true, phone: true, status: true, createdAt: true } });
    if (items.length > 10000) return new Response("Reduza a seleção para até 10000 inscrições.", { status: 413 });
    await db.adminLog.create({ data: { userId: user.id, action: "event.registrations.export", resource: id, metadata: { count: items.length } } });
    const lines = [["Nome", "E-mail", "Telefone", "Estado", "Recebida em UTC"], ...items.map(i => [i.name, i.email, i.phone, registrationStatuses[i.status], i.createdAt.toISOString()])];
    return new Response("\uFEFF" + lines.map(row => row.map(csvCell).join(",")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="inscricoes-${event.slug}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Exportação indisponível.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
