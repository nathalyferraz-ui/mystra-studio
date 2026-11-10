"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./brand";
import type { SiteSettings } from "@/features/institutional/schema";
import { publicLinkEnabled, releaseCTA } from "@/config/release";
export function PublicHeader({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close);
  }, [open]);
  const navigation = settings.navigation.filter(i => i.visible && publicLinkEnabled(i.href)); const cta = releaseCTA(settings.navigationCTA);
  return <header className="site-header"><div className="container header-inner"><Brand name={settings.general.brand} displayName={settings.general.displayName} imageId={settings.identity.darkLogoId || settings.identity.logoId} /><nav aria-label="Navegação principal" className="desktop-nav">{navigation.map(item => <Link key={item.id} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}</nav><Link href={cta.href} className="header-contact">{cta.label} <ArrowUpRight size={16} /></Link><button ref={toggle} type="button" className="mobile-toggle" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>{open && <nav id="mobile-nav" className="mobile-nav container" aria-label="Navegação mobile">{[...navigation, { id: "principal-cta", ...cta }].map(item => <Link key={item.id} href={item.href} onClick={() => setOpen(false)} aria-current={pathname === item.href ? "page" : undefined}>{item.label}<ArrowUpRight size={16} /></Link>)}</nav>}</header>;
}
