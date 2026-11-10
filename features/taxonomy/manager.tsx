"use client";
import Link from "next/link";
import { Textarea } from "@/components/ui";
import { useRef, useState, useTransition } from "react";
import { Button, Input, Select } from "@/components/ui";
import { mutateTaxonomy } from "./actions";
import { slugify } from "@/features/cms/config";
import type { ActionResult } from "@/features/cms/schema";
const entities = { SERVICE: "Categoria de serviços", PROJECT: "Categoria de projetos", ARTICLE: "Categoria de artigos", TAG: "Tag de artigos", TECHNOLOGY: "Tecnologia" };
export type TaxonomyItem = { id: string; name: string; slug: string; entity: keyof typeof entities; description?: string; associations?: number; associationUrl?: string };
export function TaxonomyForm({ item }: { item?: TaxonomyItem }) {
  const [description, setDescription] = useState(item?.description ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [entity, setEntity] = useState(item?.entity ?? "ARTICLE");
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  return <div className="card taxonomy-item"><form className="taxonomy-form" onSubmit={event => { event.preventDefault(); start(async () => { const response = await mutateTaxonomy({ id: item?.id, name, slug, entity, description }); setResult(response); if (response.ok && !item) { setName(""); setSlug(""); setDescription(""); } }); }}><label>Tipo<Select value={entity} disabled={!!item || pending} onChange={e => setEntity(e.target.value as keyof typeof entities)}>{Object.entries(entities).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label><label>Nome<Input required minLength={2} maxLength={100} value={name} onChange={e => { setName(e.target.value); if (!item) setSlug(slugify(e.target.value)); }} disabled={pending} /></label><label>Slug<Input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={150} value={slug} onChange={e => setSlug(e.target.value)} disabled={pending} /></label><label>Descrição<Textarea value={description} maxLength={1500} onChange={e => setDescription(e.target.value)} disabled={pending} /></label><Button type="submit" disabled={pending}>{pending ? "Salvando…" : item ? "Salvar" : "Criar marcador"}</Button>{item && <Button type="button" variant="ghost" onClick={() => dialog.current?.showModal()}>Excluir</Button>}</form>{item?.associationUrl && <p className="form-hint"><Link href={item.associationUrl}>{item.associations ?? 0} conteúdo(s) associado(s) ↗</Link></p>}{result && <p role={result.ok ? "status" : "alert"} className={result.ok ? "field-success" : "field-error"}>{result.message}</p>}{item && <dialog ref={dialog} aria-label="Confirmar exclusão do marcador"><h2>Excluir {item.name}?</h2><p>Somente marcadores sem vínculos podem ser excluídos. Conteúdos não serão removidos.</p><div className="row-actions"><Button type="button" variant="secondary" disabled={pending} onClick={() => dialog.current?.close()}>Cancelar</Button><Button type="button" disabled={pending} onClick={() => start(async () => { const response = await mutateTaxonomy(item, true); setResult(response); if (response.ok) dialog.current?.close(); })}>Confirmar exclusão</Button></div>{result && !result.ok && <p role="alert" className="field-error">{result.message}</p>}</dialog>}</div>;
}
