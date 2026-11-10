"use client";
/* eslint-disable @next/next/no-img-element -- Private images remain behind the media handler. */
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import type { MediaOption } from "@/features/cms/editor";
import { moveGalleryImage } from "./editorial";
import "./portfolio.css";

export function ProjectMediaPicker({ media, selected, captions, onChange, onCaption, onUploaded, configured, onBusy, title = "Galeria do projeto", entityLabel = "projeto" }: {
  title?: string; entityLabel?: string;
  media: MediaOption[]; selected: string[]; captions: Record<string, string>; configured: boolean;
  onChange: (ids: string[]) => void; onCaption: (id: string, value: string) => void;
  onUploaded: (item: MediaOption) => void; onBusy: (value: boolean) => void;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function upload() {
    const image = file.current?.files?.[0];
    if (!image || !name.trim() || !alt.trim()) { setMessage("Informe arquivo, nome e descrição alternativa."); return; }
    if (image.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(image.type)) { setMessage("Use JPEG, PNG ou WebP de até 8 MB."); return; }
    setPending(true); onBusy(true); setMessage("");
    try {
      const form = new FormData(); form.set("file", image); form.set("name", name); form.set("alt", alt);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Upload recusado.");
      onUploaded({ id: data.id, name: data.name, alt: data.alt });
      if (selected.length < 30) onChange([...selected, data.id]);
      setName(""); setAlt(""); if (file.current) file.current.value = "";
      setMessage(`Imagem registrada na biblioteca. Salve o ${entityLabel} para confirmar as associações.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar a imagem."); }
    finally { setPending(false); onBusy(false); }
  }
  return <section className="card form-section ms-work-picker"><h2>{title}</h2><label>Adicionar da biblioteca<Select value="" disabled={selected.length >= 30} onChange={e => { if (e.target.value && !selected.includes(e.target.value)) onChange([...selected, e.target.value]); }}><option value="">Selecione uma imagem</option>{media.filter(item => !selected.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label><p className="form-hint">Até 30 imagens. A ordem abaixo será mantida na página pública. Remover uma associação preserva o arquivo na biblioteca.</p><ol className="ms-work-pickerList">{selected.map((id, index) => { const item = media.find(item => item.id === id); return <li key={id}><img src={`/api/media/${id}`} alt={item?.alt ?? "Imagem selecionada"} loading="lazy" /><div><span>{item?.name ?? "Imagem indisponível"}</span><label>Legenda opcional<Input value={captions[id] ?? ""} maxLength={300} onChange={e => onCaption(id, e.target.value)} /></label><a href={`/api/media/${id}`} target="_blank" rel="noopener noreferrer">Visualizar arquivo ↗</a></div><div className="ms-work-pickerActions"><button type="button" aria-label={`Mover ${item?.name ?? "imagem"} para cima`} disabled={index === 0} onClick={() => onChange(moveGalleryImage(selected, index, -1))}><ArrowUp size={16} /></button><button type="button" aria-label={`Mover ${item?.name ?? "imagem"} para baixo`} disabled={index === selected.length - 1} onClick={() => onChange(moveGalleryImage(selected, index, 1))}><ArrowDown size={16} /></button><button type="button" aria-label={`Remover associação de ${item?.name ?? "imagem"}`} onClick={() => onChange(selected.filter(value => value !== id))}><X size={16} /></button></div></li>; })}</ol>{!selected.length && <p className="form-hint">Nenhuma imagem associada à galeria.</p>}<details className="ms-work-inlineUpload"><summary>Enviar uma nova imagem</summary>{!configured && <p className="form-error" role="status">O upload depende da configuração do Supabase Storage. A seleção de arquivos já cadastrados continua disponível.</p>}<label>Arquivo<Input ref={file} type="file" accept="image/jpeg,image/png,image/webp" disabled={!configured || pending} /></label><label>Nome<Input value={name} maxLength={180} onChange={e => setName(e.target.value)} disabled={!configured || pending} /></label><label>Descrição alternativa<Input value={alt} maxLength={300} onChange={e => setAlt(e.target.value)} disabled={!configured || pending} /></label><Button type="button" variant="secondary" disabled={!configured || pending} onClick={upload}>{pending ? "Enviando…" : "Enviar para a biblioteca"}</Button>{message && <p className="form-hint" role="status">{message}</p>}</details></section>;
}
