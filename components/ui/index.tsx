import Link from "next/link";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" }) {
  return <button className={`button button-${variant} ${className}`} {...props} />;
}
export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "ghost" }) {
  return <Link href={href} className={`button button-${variant}`}>{children}<ArrowUpRight size={17} aria-hidden="true" /></Link>;
}
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}
export function Input(props: ComponentProps<"input">) { return <input {...props} className={`input ${props.className ?? ""}`} />; }
export function Textarea(props: ComponentProps<"textarea">) { return <textarea {...props} className={`input ${props.className ?? ""}`} />; }
export function Select(props: ComponentProps<"select">) { return <select {...props} className={`input ${props.className ?? ""}`} />; }
export function EmptyState({ title, children, label = "Em preparação" }: { title: string; children: ReactNode; label?: string | false }) {
  return <div className="empty-state"><span className="empty-icon"><FolderOpen size={28} aria-hidden="true" /></span><h2>{title}</h2><p>{children}</p>{label && <Badge>{label}</Badge>}</div>;
}
export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  return <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}><table><caption>{caption}</caption>{children}</table></div>;
}
export function LoadingState() { return <div className="loading" role="status"><span className="spinner" />Carregando conteúdo…</div>; }
