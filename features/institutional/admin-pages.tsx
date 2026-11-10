import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { Badge, Table } from "@/components/ui";
import { InstitutionalEditor } from "./editor";
import { documentIds, type DocumentId, type PageDocument, type SiteSettings } from "./schema";
import { readDocument } from "./repository";
import { RenderInstitutionalPage } from "./public-renderer";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import "./institutional.css";
export const documentTitles: Record<DocumentId, string> = { home: "Home", sobre: "O Estúdio", settings: "Configurações institucionais", equipe: "Equipe conceitual", parceiros: "Parceiros", faq: "Perguntas frequentes" };
function viewPermission(key: DocumentId) { return key === "settings" ? "settings:manage" : key === "home" || key === "sobre" ? "pages:read" : "institutional:manage"; }
export async function InstitutionalList() {
  const user = await requireUser(); if (!hasPermission(user, "pages:read")) return <p role="alert">Acesso restrito.</p>;
  const items = await Promise.all((["home", "sobre"] as const).map(async key => ({ key, state: await readDocument(getDb(), key) })));
  const ids = [...new Set(items.map(i => i.state.editedBy).filter(Boolean))]; const authors = await getDb().user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return <><div className="admin-page-heading"><div><span className="eyebrow">CMS INSTITUCIONAL</span><h1>Páginas</h1><p>O layout editorial é preservado. Edite os campos estruturados e publique quando estiver pronto.</p></div></div><Table caption="Páginas institucionais"><thead><tr><th>Página / rota</th><th>Estado</th><th>Última edição</th><th>Seções</th><th>Ações</th></tr></thead><tbody>{items.map(({ key, state }) => <tr key={key}><td>{documentTitles[key]}<br /><small>{key === "home" ? "/" : "/sobre"}</small></td><td><Badge>{state.published ? "Publicada" : state.version ? "Rascunho / padrão público" : "Padrão estrutural"}</Badge><small> · versão {state.version}</small></td><td>{state.editedAt ? new Date(state.editedAt).toLocaleString("pt-BR") : "Ainda não salva"}<br /><small>{authors.find(a => a.id === state.editedBy)?.name || "—"}</small></td><td>{(state.draft as PageDocument).sections.length}</td><td><div className="row-actions"><Link href={`/admin/paginas/${key}/editar`}>Editar</Link><Link href={`/admin/paginas/${key}/preview`}>Prévia privada</Link></div></td></tr>)}</tbody></Table></>;
}
export async function InstitutionalEdit({ id }: { id: string }) {
  const user = await requireUser(); if (!documentIds.includes(id as DocumentId)) notFound(); const key = id as DocumentId;
  if (!hasPermission(user, viewPermission(key))) return <p role="alert">Acesso restrito.</p>;
  const [state, media] = await Promise.all([readDocument(getDb(), key), getDb().media.findMany({ where: { state: "READY" }, select: { id: true, name: true, alt: true }, orderBy: { createdAt: "desc" }, take: 1000 })]);
  const canUpdate = hasPermission(user, key === "home" || key === "sobre" ? "pages:update" : viewPermission(key)); const canPublish = hasPermission(user, key === "home" || key === "sobre" ? "pages:publish" : viewPermission(key));
  return <><nav className="page-back" aria-label="Caminho da página"><Link href="/admin">Administração</Link> / <Link href="/admin/paginas">Institucional</Link> / {documentTitles[key]}</nav><div className="admin-page-heading"><div><span className="eyebrow">CONTEÚDO ESTRUTURADO</span><h1>{documentTitles[key]}</h1><p>Textos e links seguros, sem HTML ou código arbitrário. Nada é inserido automaticamente no banco.</p></div></div><InstitutionalEditor key={`${key}-${state.version}`} docKey={key} initial={state} media={media} canUpdate={canUpdate} canPublish={canPublish} /></>;
}
export async function InstitutionalPreview({ id }: { id: string }) {
  const user = await requireUser(); if (!["home", "sobre", "settings"].includes(id)) notFound(); const key = id as "home" | "sobre" | "settings";
  if (!hasPermission(user, viewPermission(key))) return <p role="alert">Acesso restrito.</p>;
  const state = await readDocument(getDb(), key);
  return <div className="institutional-preview"><div className="institutional-previewNotice">PRÉVIA PRIVADA · Rascunho salvo, versão {state.version}. Esta tela não altera o portal.</div>{key === "settings" ? <><PublicHeader settings={state.draft as SiteSettings} /><section className="section container"><h1>Prévia da identidade e navegação</h1><p>Confira o header e o rodapé deste rascunho. Configurações SEO são aplicadas após publicação.</p></section><PublicFooter settings={state.draft as SiteSettings} /></> : <RenderInstitutionalPage document={state.draft as PageDocument} />}</div>;
}
