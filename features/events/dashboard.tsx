import Link from "next/link";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { Card, Table } from "@/components/ui";
import { eventsReady } from "./availability";
import { occupiedStatuses } from "./repository";
import { registrationAvailability } from "./rules";
import { eventDate } from "./time";
export async function EventsDashboard() {
  const user = await requireUser(); if (!hasPermission(user, "content:manage") || !await eventsReady()) return null;
  const db = getDb(), now = new Date();
  const [total, published, upcoming, completed, registrations, candidates, latest] = await Promise.all([
    db.event.count(), db.event.count({ where: { status: "PUBLISHED", publishedAt: { lte: now } } }), db.event.count({ where: { status: "PUBLISHED", publishedAt: { lte: now }, startsAt: { gt: now } } }), db.event.count({ where: { status: "PUBLISHED", endsAt: { lt: now } } }), db.eventRegistration.count(),
    db.event.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: now }, startsAt: { gt: now } }, select: { status: true, startsAt: true, publishedAt: true, capacity: true, registrationOpen: true, registrationStartsAt: true, registrationEndsAt: true, _count: { select: { registrations: { where: { status: { in: occupiedStatuses } } } } } } }),
    db.event.findMany({ orderBy: { startsAt: "desc" }, take: 8, select: { id: true, title: true, startsAt: true, timezone: true, capacity: true, _count: { select: { registrations: { where: { status: { in: occupiedStatuses } } } } } } }),
  ]);
  const open = candidates.filter(e => registrationAvailability(e, e._count.registrations, now).open).length;
  const full = candidates.filter(e => e.capacity !== null && e._count.registrations >= e.capacity).length;
  const stats = [["Eventos cadastrados", total], ["Eventos publicados", published], ["Próximos eventos", upcoming], ["Eventos encerrados", completed], ["Inscrições registradas", registrations], ["Eventos com inscrições abertas", open], ["Próximos eventos lotados", full]] as const;
  return <section className="ms-events-dashboard"><div className="row-actions"><h2>Eventos & Workshops</h2><Link href="/admin/eventos" className="text-link">Gerenciar programação ↗</Link></div><div className="dashboard-grid">{stats.map(([label, value]) => <Card key={label}><p className="stat-label">{label}</p><p className="stat-value">{value}</p></Card>)}</div>{latest.length > 0 && <Table caption="Inscrições ativas nos últimos oito eventos por data"><thead><tr><th scope="col">Evento</th><th scope="col">Data</th><th scope="col">Inscrições ativas</th><th scope="col">Capacidade</th></tr></thead><tbody>{latest.map(e => <tr key={e.id}><td><Link href={`/admin/eventos/${e.id}/inscricoes`}>{e.title}</Link></td><td>{eventDate(e.startsAt, e.timezone)}</td><td>{e._count.registrations}</td><td>{e.capacity ?? "Sem limite"}</td></tr>)}</tbody></Table>}</section>;
}
