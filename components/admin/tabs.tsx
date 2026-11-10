"use client";
import { useId, useState, type ReactNode } from "react";
export function AdminTabs({ label, tabs }: { label: string; tabs: { id: string; label: string; content: ReactNode }[] }) {
  const uid = useId(), [selected, setSelected] = useState(tabs[0]?.id);
  return <><div role="tablist" aria-label={label} className="ma-content-tabs">{tabs.map((tab, index) => <button type="button" key={tab.id} role="tab" id={`${uid}-${tab.id}`} aria-controls={`${uid}-panel-${tab.id}`} aria-selected={selected === tab.id} tabIndex={selected === tab.id ? 0 : -1} onClick={() => setSelected(tab.id)} onKeyDown={e => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return; e.preventDefault(); const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; setSelected(tabs[next].id); (e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus(); }}>{tab.label}</button>)}</div>{tabs.map(tab => <div role="tabpanel" key={tab.id} id={`${uid}-panel-${tab.id}`} aria-labelledby={`${uid}-${tab.id}`} hidden={selected !== tab.id} tabIndex={0}>{tab.content}</div>)}</>;
}
