import { adminModules } from "@/config/navigation";
import { adminNavigation, type AdminNavItem } from "@/features/admin/navigation";
export const demoSections = ["servicos", "portfolio", "blog", "eventos", "leads", "vagas"] as const;
export type DemoSection = typeof demoSections[number];
export function isDemoSection(value: string): value is DemoSection { return (demoSections as readonly string[]).includes(value); }
export function demoNavigation(): AdminNavItem[] {
  return [...adminNavigation(adminModules.filter(m => (demoSections as readonly string[]).includes(m.slug))).map(item => item.id === "dashboard" ? item : { ...item, href: `/admin/explorar/${item.id}` }), { id: "demo-info", label: "Sobre a demonstração", href: "/admin/demonstracao", group: "overview", icon: "CircleHelp" }];
}
