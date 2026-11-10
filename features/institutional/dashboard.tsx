import Link from "next/link";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { Card } from "@/components/ui";
import { type DocumentId } from "./schema";
import { institutionPrefix, parseState } from "./repository";
export async function InstitutionalDashboard({ standalone = false }: { standalone?: boolean }) {
  const user = await requireUser(); const keys: DocumentId[] = [];
  if (hasPermission(user, "pages:read")) keys.push("home", "sobre"); if (hasPermission(user, "institutional:manage")) keys.push("equipe", "parceiros", "faq"); if (hasPermission(user, "settings:manage")) keys.push("settings");
  const rows = keys.length ? await getDb().institutionalSetting.findMany({ where: { key: { in: keys.map(k => `${institutionPrefix}${k}`) } }, select: { key: true, value: true } }) : [];
  const states = rows.map(row => ({ key: row.key.slice(institutionPrefix.length) as DocumentId, state: parseState(row.key.slice(institutionPrefix.length) as DocumentId, row.value) }));
  const publishedPages = states.filter(i => ["home", "sobre"].includes(i.key) && i.state.published).length;
  const count = (key: DocumentId) => { const data = states.find(s => s.key === key)?.state.published; return data && "items" in data ? data.items.filter(i => i.published).length : 0; };
  return <section className="institutional-history">{standalone ? <h1>Workspace institucional</h1> : <h2 className="subheading">Conteúdo institucional</h2>}<p className="form-hint">Somente estados persistidos e publicações do CMS. Os padrões estruturais do portal não são contados como registros.</p><div className="dashboard-grid">{hasPermission(user, "pages:read") && <Card><p className="stat-label">Páginas com publicação salva</p><p className="stat-value">{publishedPages}</p><Link href="/admin/paginas">Gerenciar páginas ↗</Link></Card>}{hasPermission(user, "institutional:manage") && ([['equipe', 'Perfis conceituais publicados'], ['parceiros', 'Parceiros publicados'], ['faq', 'Perguntas publicadas']] as const).map(([key, label]) => <Card key={key}><p className="stat-label">{label}</p><p className="stat-value">{count(key)}</p><Link href={`/admin/${key}`}>Gerenciar ↗</Link></Card>)}</div><div className="row-actions">{hasPermission(user, "settings:manage") && <Link href="/admin/configuracoes">Configurações ↗</Link>}{hasPermission(user, "users:manage") && <Link href="/admin/usuarios">Usuários ↗</Link>}{hasPermission(user, "audit:read") && <Link href="/admin/logs">Auditoria ↗</Link>}</div></section>;
}
