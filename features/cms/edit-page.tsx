import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { cmsModules, isCmsModule } from "./config";
import { editOptions, contentInclude } from "./queries";
import { ContentForm } from "./content-form";
import { parseRichDocument, emptyDocument } from "./rich-text";
import type { ContentInput } from "./schema";
import { parseProjectEditorial } from "@/features/portfolio/editorial";
import { storageConfigured } from "@/lib/storage";
export async function ContentEditPage({ section, id, saved }: { section: string; id?: string; saved?: boolean }) {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return <div role="alert"><h1>Acesso restrito</h1><p>Seu perfil não permite gerenciar conteúdo.</p></div>;
  if (!isCmsModule(section)) notFound();
  const [options, item] = await Promise.all([editOptions(section), id ? getDb().content.findUnique({ where: { id, kind: cmsModules[section].kind }, include: contentInclude }) : null]);
  if (id && !item) notFound();
  const initial: ContentInput = {
    id: item?.id, version: item?.version, module: section,
    title: item?.title ?? "", slug: item?.slug ?? "", summary: item?.summary ?? "", description: item?.description ?? "",
    body: section === "portfolio" ? parseProjectEditorial(item?.body ?? emptyDocument) : item ? parseRichDocument(item.body) : emptyDocument,
    challenge: item?.challenge ?? "", solution: item?.solution ?? "", results: item?.results ?? "",
    externalUrl: item?.externalUrl ?? "", icon: item?.icon ?? "", benefits: item?.benefits ?? [],
    status: item?.status ?? "DRAFT", featured: item?.featured ?? false, sortOrder: item?.sortOrder ?? 0,
    categoryId: item?.categoryId ?? "", coverId: item?.coverId ?? "", authorId: item?.authorId ?? user.id,
    galleryIds: item?.mediaLinks.filter(m => m.gallery).map(m => m.mediaId) ?? [], tagIds: item?.tags.map(t => t.id) ?? [], technologyIds: item?.technologies.map(t => t.id) ?? [],
    seoTitle: item?.seoTitle ?? "", seoDescription: item?.seoDescription ?? "",
  };
  return <><div className="admin-page-heading"><div><span className="eyebrow">{cmsModules[section].label}</span><h1>{item ? "Editar conteúdo" : `Novo ${cmsModules[section].singular}`}</h1><p>Rascunhos e prévias são exclusivos do ambiente administrativo.</p></div><div className="row-actions"><Link className="text-link" href={`/admin/${section}`}>← Voltar à listagem</Link>{item && <Link className="text-link" href={`/admin/${section}/${item.id}/preview`}>Prévia salva ↗</Link>}</div></div>{saved && <p className="notice notice-success" role="status">Alterações salvas com sucesso.</p>}<ContentForm key={item ? `${item.id}:${item.version}` : "new"} section={section} initial={initial} options={options} mediaUploadConfigured={storageConfigured()} /></>;
}
