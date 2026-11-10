"use client";
/* eslint-disable @next/next/no-img-element -- Authorized private storage proxy. */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Badge } from "@/components/ui";
import { deleteMedia, updateMedia } from "./actions";
import type { ActionResult } from "@/features/cms/schema";
export type MediaView = { id: string; name: string; alt: string; width: number; height: number; size: number; mimeType: string; state: string; createdAt: string; references: number };
export function MediaUpload({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  return <section className="card form-section"><h2>Enviar imagem</h2>{!configured && <p className="form-error" role="status">Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e um bucket privado em SUPABASE_STORAGE_BUCKET para habilitar uploads.</p>}<form className="media-upload" onSubmit={async event => {
    event.preventDefault(); const form = event.currentTarget; setPending(true); setMessage(""); setOk(false);
    try { const response = await fetch("/api/media", { method: "POST", body: new FormData(form) }); const data = await response.json(); if (!response.ok) throw new Error(data.message ?? "Envio recusado."); setMessage("Imagem enviada e registrada na biblioteca."); setOk(true); form.reset(); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem."); }
    finally { setPending(false); }
  }}><fieldset disabled={!configured || pending}><label>Arquivo (JPEG, PNG ou WebP até 8 MB)<Input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label><label>Nome da imagem<Input name="name" required maxLength={180} /></label><label>Descrição alternativa<Input name="alt" required maxLength={300} /></label><Button type="submit" disabled={!configured || pending}>{pending ? "Validando e enviando…" : "Enviar imagem"}</Button></fieldset></form>{message && <p className={ok ? "notice notice-success" : "form-error"} role={ok ? "status" : "alert"}>{message}</p>}<p className="form-hint">As imagens são verificadas, convertidas para WebP, redimensionadas e armazenadas sem os metadados originais. SVG e arquivos animados não são aceitos.</p></section>;
}
export function MediaCard({ item }: { item: MediaView }) {
  const [name, setName] = useState(item.name);
  const [alt, setAlt] = useState(item.alt);
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();
  const preview = useRef<HTMLDialogElement>(null);
  const remove = useRef<HTMLDialogElement>(null);
  return <article className="card media-card"><button type="button" className="media-thumbnail" onClick={() => preview.current?.showModal()} aria-label={`Visualizar ${item.name}`} disabled={item.state !== "READY"}><img src={`/api/media/${item.id}`} alt={item.alt} loading="lazy" /></button><Badge tone={item.state === "READY" ? "neutral" : "warning"}>{item.state === "READY" ? `${item.width} × ${item.height}` : "Remoção pendente"}</Badge><p className="form-hint">{Math.ceil(item.size / 1024)} KB · {item.references} vínculo(s) · {new Date(item.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p><form onSubmit={event => { event.preventDefault(); start(async () => setResult(await updateMedia({ id: item.id, name, alt }))); }}><label>Nome<Input value={name} onChange={e => setName(e.target.value)} required maxLength={180} disabled={pending || item.state !== "READY"} /></label><label>Descrição alternativa<Input value={alt} onChange={e => setAlt(e.target.value)} required maxLength={300} disabled={pending || item.state !== "READY"} /></label><div className="row-actions"><Button type="submit" variant="secondary" disabled={pending || item.state !== "READY"}>Salvar</Button><Button type="button" variant="ghost" disabled={pending || item.references > 0} onClick={() => { setConfirmation(""); remove.current?.showModal(); }}>{item.state === "DELETING" ? "Retomar exclusão" : "Excluir"}</Button></div></form>{result && <p role={result.ok ? "status" : "alert"} className={result.ok ? "field-success" : "field-error"}>{result.message}</p>}<dialog className="media-preview-dialog" ref={preview} aria-label={`Visualização de ${item.name}`}><h2>{item.name}</h2><img src={`/api/media/${item.id}`} alt={item.alt} /><p>{item.alt}</p><Button type="button" onClick={() => preview.current?.close()}>Fechar</Button></dialog><dialog ref={remove} aria-label="Confirmar exclusão da imagem"><h2>Excluir esta imagem?</h2><p>O arquivo será removido do Storage e da biblioteca. Confirme digitando: <strong>{item.name}</strong></p><label htmlFor={`remove-${item.id}`}>Nome da imagem</label><Input id={`remove-${item.id}`} value={confirmation} onChange={e => setConfirmation(e.target.value)} /><div className="row-actions"><Button type="button" variant="secondary" disabled={pending} onClick={() => remove.current?.close()}>Cancelar</Button><Button type="button" disabled={pending || confirmation !== item.name} onClick={() => start(async () => { const response = await deleteMedia(item.id, confirmation); setResult(response); if (response.ok) remove.current?.close(); })}>{pending ? "Excluindo…" : "Confirmar exclusão"}</Button></div>{result && !result.ok && <p role="alert" className="field-error">{result.message}</p>}</dialog></article>;
}
