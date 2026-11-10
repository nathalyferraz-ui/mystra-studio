"use client";
/* eslint-disable @next/next/no-img-element -- Existing authorized media endpoint. */
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Maximize2, X } from "lucide-react";

export type GalleryImage = { id: string; alt: string; width: number; height: number; caption?: string };
export function ProjectGallery({ images }: { images: GalleryImage[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const image = active === null ? null : images[active];
  return <><div className="ms-work-gallery">{images.map((item, index) => <figure key={item.id}><button type="button" className="ms-work-galleryImage" aria-label={`Ampliar imagem: ${item.alt}`} onClick={() => { setActive(index); dialog.current?.showModal(); }}><img src={`/api/media/${item.id}`} alt={item.alt} width={item.width} height={item.height} loading="lazy" /><span><Maximize2 size={18} aria-hidden="true" /></span></button>{item.caption && <figcaption>{item.caption}</figcaption>}</figure>)}</div><dialog ref={dialog} className="ms-work-lightbox" aria-label="Galeria ampliada do projeto" onClose={() => setActive(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onKeyDown={event => { if (active === null) return; if (event.key === "ArrowRight") { event.preventDefault(); setActive(Math.min(images.length - 1, active + 1)); } if (event.key === "ArrowLeft") { event.preventDefault(); setActive(Math.max(0, active - 1)); } }}><div className="ms-work-lightboxTop"><span role="status">Imagem {(active ?? 0) + 1} de {images.length}</span><button type="button" aria-label="Fechar visualização" onClick={() => dialog.current?.close()}><X size={22} /></button></div>{image && <><img src={`/api/media/${image.id}`} alt={image.alt} /><div className="ms-work-lightboxBottom"><button type="button" aria-label="Imagem anterior" disabled={active === 0} onClick={() => setActive(Math.max(0, (active ?? 0) - 1))}><ArrowLeft size={20} /></button><p>{image.caption || image.alt}</p><button type="button" aria-label="Próxima imagem" disabled={active === images.length - 1} onClick={() => setActive(Math.min(images.length - 1, (active ?? 0) + 1))}><ArrowRight size={20} /></button></div></>}</dialog></>;
}
