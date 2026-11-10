"use client";
import { useEffect, useState } from "react";
import { Copy, Link as LinkIcon } from "lucide-react";
import type { RichHeading } from "@/features/cms/rich-text";

export function ReadingTools({ headings, title }: { headings: RichHeading[]; title: string }) {
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const body = document.getElementById("insight-reading-body");
    if (!body) return;
    let frame = 0;
    const update = () => { frame = 0; setUrl(`${location.origin}${location.pathname}`); const rect = body.getBoundingClientRect(); const visible = window.innerHeight - 120; const distance = Math.max(1, rect.height - visible); setProgress(Math.max(0, Math.min(1, (120 - rect.top) / distance))); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule); observer.observe(body); schedule();
    window.addEventListener("scroll", schedule, { passive: true }); window.addEventListener("resize", schedule);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);
  return <aside className="ms-insights-readingTools"><div className="ms-insights-progress" role="progressbar" aria-label="Progresso de leitura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ transform: `scaleX(${progress})` }} /></div>{!!headings.length && <details className="ms-insights-toc" open><summary>Nesta leitura</summary><nav aria-label="Sumário do artigo">{headings.map(heading => <a className={`ms-insights-tocLevel${heading.level}`} key={heading.id} href={`#${heading.id}`}>{heading.text || "Seção"}</a>)}</nav></details>}<div className="ms-insights-share"><span className="ms-insights-label">COMPARTILHAR IDEIAS</span>{url && <><a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">LinkedIn <LinkIcon size={13} aria-hidden="true" /></a><a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp <LinkIcon size={13} aria-hidden="true" /></a><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage("Link copiado."); } catch { setMessage("Não foi possível copiar. Use o endereço na barra do navegador."); } }}>Copiar URL <Copy size={14} aria-hidden="true" /></button></>}{message && <p role="status">{message}</p>}</div></aside>;
}
