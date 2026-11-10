"use client";
import { useId, useRef, useState, useEffect, type RefObject } from "react";
import Link from "next/link";
import { Search, X, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { AdminIcon } from "./icons";
import { adminGroups, navigationMatches, type AdminNavItem } from "@/features/admin/navigation";
export function AdminCommandMenu({ items, actions, dialogRef }: { items: AdminNavItem[]; actions: AdminNavItem[]; dialogRef: RefObject<HTMLDialogElement | null> }) {
  const id = useId(), inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""), [index, setIndex] = useState(0);
  const choices = [...actions.map(item => ({ ...item, action: true })), ...items.filter(item => !item.unavailable).map(item => ({ ...item, action: false }))].filter(item => navigationMatches(item, query)).slice(0, 14);
  const selected = choices[Math.min(index, Math.max(0, choices.length - 1))];
  useEffect(() => { if (dialogRef.current?.open && selected) document.getElementById(`${id}-${selected.id}`)?.scrollIntoView({ block: "nearest" }); }, [id, selected, dialogRef]);
  useEffect(() => { const dialog = dialogRef.current; const clear = () => { setQuery(""); setIndex(0); }; const focus = () => { if (dialog?.open) inputRef.current?.focus(); }; dialog?.addEventListener("close", clear); dialog?.addEventListener("toggle", focus); return () => { dialog?.removeEventListener("close", clear); dialog?.removeEventListener("toggle", focus); }; }, [dialogRef]);
  return <dialog ref={dialogRef} className="ma-command" aria-labelledby={`${id}-title`} onClick={e => { if (e.target === e.currentTarget) dialogRef.current?.close(); }}>
    <div className="ma-command-title"><h2 id={`${id}-title`}>Ir para o workspace</h2><button type="button" className="ma-icon-button" onClick={() => dialogRef.current?.close()} aria-label="Fechar busca"><X size={18} /></button></div>
    <div className="ma-command-input"><Search size={20} aria-hidden="true" /><input ref={inputRef} autoFocus value={query} onChange={e => { setQuery(e.target.value); setIndex(0); }} placeholder="Busque módulos ou ações…" aria-label="Pesquisar módulos e ações" role="combobox" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={selected ? `${id}-${selected.id}` : undefined} autoComplete="off" onKeyDown={e => { if (["ArrowDown", "ArrowUp"].includes(e.key)) { e.preventDefault(); setIndex(previous => (previous + (e.key === "ArrowDown" ? 1 : -1) + choices.length) % (choices.length || 1)); } else if (e.key === "Enter" && selected) { e.preventDefault(); document.getElementById(`${id}-${selected.id}`)?.click(); } }} /></div>
    <p className="ma-command-description">Navegação e atalhos disponíveis para sua conta.</p><ul role="listbox" id={`${id}-list`} aria-label="Resultados de navegação" className="ma-command-results">{choices.map((item, i) => <li key={item.id} role="none" onMouseEnter={() => setIndex(i)}><Link href={item.href} role="option" tabIndex={-1} id={`${id}-${item.id}`} aria-selected={selected?.id === item.id} onMouseDown={e => e.preventDefault()} onClick={() => dialogRef.current?.close()}><span className="ma-command-result-icon"><AdminIcon name={item.icon} /></span><span>{item.label}<small>{item.action ? "Ação rápida" : adminGroups.find(g => g.id === item.group)?.label}</small></span><CornerDownLeft size={14} aria-hidden="true" /></Link></li>)}</ul>{!choices.length && <p className="ma-command-empty" role="status">Nenhum módulo ou atalho corresponde à busca.</p>}<footer><span><ArrowUp size={12} /><ArrowDown size={12} /> navegar</span><span><CornerDownLeft size={12} /> abrir</span><span><kbd>Esc</kbd> fechar</span></footer>
  </dialog>;
}
