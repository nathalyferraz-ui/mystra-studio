"use client";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { changePublication, deleteContent, setProjectArchive, setArticleArchive } from "./actions";
import type { CmsModule } from "./config";
import type { ActionResult } from "./schema";
export function ContentRowActions({ section, id, title, version, published, archived = false }: { section: CmsModule; id: string; title: string; version: number; published: boolean; archived?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();
  return <><div className="row-actions"><Link href={`/admin/${section}/${id}/editar`} className="text-link">Editar</Link><Link href={`/admin/${section}/${id}/preview`} className="text-link">Prévia</Link>{!archived && <Button type="button" variant="ghost" disabled={pending} onClick={() => start(async () => setResult(await changePublication(section, id, version, !published)))}>{published ? "Despublicar" : "Publicar"}</Button>}{(section === "portfolio" || section === "blog") && <Button type="button" variant="ghost" disabled={pending} onClick={() => start(async () => setResult(await (section === "portfolio" ? setProjectArchive : setArticleArchive)(id, version, !archived)))}>{archived ? "Restaurar rascunho" : "Arquivar"}</Button>}<Button type="button" variant="ghost" disabled={pending} onClick={() => { setConfirmation(""); dialog.current?.showModal(); }}>Excluir</Button></div>{result && <p role={result.ok ? "status" : "alert"} className={result.ok ? "field-success" : "field-error"}>{result.message}</p>}<dialog ref={dialog} aria-label={`Excluir ${title}`}><h2>Excluir conteúdo?</h2><p>Esta ação remove o conteúdo do painel e do portal. Os arquivos de mídia serão preservados. Para confirmar, digite: <strong>{title}</strong></p><label htmlFor={`confirm-${id}`}>Título do conteúdo</label><Input id={`confirm-${id}`} value={confirmation} onChange={e => setConfirmation(e.target.value)} /><div className="row-actions"><Button variant="secondary" type="button" onClick={() => dialog.current?.close()} disabled={pending}>Cancelar</Button><Button type="button" disabled={pending || confirmation !== title} onClick={() => start(async () => { const res = await deleteContent(section, id, version, confirmation); setResult(res); if (res.ok) dialog.current?.close(); })}>{pending ? "Excluindo…" : "Confirmar exclusão"}</Button></div>{result && !result.ok && <p role="alert" className="field-error">{result.message}</p>}</dialog></>;
}
