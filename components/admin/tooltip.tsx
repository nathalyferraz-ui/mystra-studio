"use client";
import { useId, useRef, useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
export function AdminTooltip({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null), id = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const show = () => { const r = ref.current?.getBoundingClientRect(); if (r) setPosition({ left: r.right + 12, top: r.top + r.height / 2 }); };
  useEffect(() => { if (!position) return; const close = () => setPosition(null); const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); }; document.addEventListener("keydown", key); window.addEventListener("scroll", close, true); return () => { document.removeEventListener("keydown", key); window.removeEventListener("scroll", close, true); }; }, [position]);
  return <span ref={ref} className="ma-tooltip-anchor" onMouseEnter={show} onMouseLeave={() => setPosition(null)} onFocus={show} onBlur={() => setPosition(null)} aria-describedby={position ? id : undefined}>{children}{position && createPortal(<span id={id} role="tooltip" className="ma-tooltip" style={position}>{label}</span>, document.body)}</span>;
}
