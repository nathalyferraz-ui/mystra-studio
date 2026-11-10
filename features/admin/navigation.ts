import { hasPermission, type AccessUser } from "@/lib/permissions";

export const adminGroups = [
  { id: "overview", label: "Visão geral" },
  { id: "content", label: "Conteúdo" },
  { id: "operations", label: "Operações" },
  { id: "institutional", label: "Institucional" },
  { id: "administration", label: "Administração" },
] as const;
export type AdminGroup = typeof adminGroups[number]["id"];
export const modulePresentation = {
  paginas: { group: "content", icon: "PanelsTopLeft" },
  servicos: { group: "content", icon: "Blocks" },
  portfolio: { group: "content", icon: "GalleryVerticalEnd" },
  cursos: { group: "content", icon: "GraduationCap", unavailable: true },
  blog: { group: "content", icon: "Newspaper" },
  categorias: { group: "content", icon: "Tags" },
  documentos: { group: "content", icon: "Files", unavailable: true },
  eventos: { group: "content", icon: "CalendarDays" },
  vagas: { group: "operations", icon: "BriefcaseBusiness" },
  candidaturas: { group: "operations", icon: "UserRoundCheck" },
  leads: { group: "operations", icon: "ContactRound" },
  midias: { group: "institutional", icon: "Images" },
  equipe: { group: "institutional", icon: "UsersRound" },
  parceiros: { group: "institutional", icon: "Handshake" },
  faq: { group: "institutional", icon: "CircleHelp" },
  usuarios: { group: "administration", icon: "UserCog" },
  permissoes: { group: "administration", icon: "ShieldCheck" },
  logs: { group: "administration", icon: "History" },
  configuracoes: { group: "administration", icon: "Settings" },
} as const;
export type AdminIconName = typeof modulePresentation[keyof typeof modulePresentation]["icon"] | "LayoutDashboard" | "Plus" | "House";
export type AdminNavItem = { id: string; label: string; href: string; group: AdminGroup; icon: AdminIconName; unavailable?: boolean };
export function adminNavigation(modules: readonly { slug: string; label: string }[]): AdminNavItem[] {
  const order = Object.keys(modulePresentation);
  return [{ id: "dashboard", label: "Dashboard", href: "/admin", group: "overview", icon: "LayoutDashboard" }, ...modules.filter(m => Object.hasOwn(modulePresentation, m.slug)).sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug)).map(m => ({ id: m.slug, label: m.label, href: `/admin/${m.slug}`, ...modulePresentation[m.slug as keyof typeof modulePresentation] }))];
}
export function activeAdminItem(path: string, items: readonly AdminNavItem[]) {
  return items.filter(item => !item.unavailable && (path === item.href || item.href !== "/admin" && path.startsWith(`${item.href}/`))).sort((a, b) => b.href.length - a.href.length)[0];
}
const quickActions = [
  { id: "new-article", label: "Novo artigo", href: "/admin/blog/novo", permission: "content:manage", icon: "Newspaper" },
  { id: "new-service", label: "Novo serviço", href: "/admin/servicos/novo", permission: "content:manage", icon: "Blocks" },
  { id: "new-project", label: "Novo projeto", href: "/admin/portfolio/novo", permission: "content:manage", icon: "GalleryVerticalEnd" },
  { id: "new-event", label: "Novo evento", href: "/admin/eventos/novo", permission: "content:manage", icon: "CalendarDays" },
  { id: "open-leads", label: "Ver solicitações", href: "/admin/leads", permission: "requests:manage", icon: "ContactRound" },
  { id: "edit-home", label: "Editar Home", href: "/admin/paginas/home/editar", permission: "pages:update", icon: "PanelsTopLeft" },
] as const;
export function permittedQuickActions(user: AccessUser): AdminNavItem[] {
  return quickActions.filter(item => hasPermission(user, item.permission)).map(({ id, label, href, icon }) => ({ id, label, href, icon, group: "overview" }));
}
export function adminBreadcrumbs(path: string, items: readonly AdminNavItem[]) {
  const current = activeAdminItem(path, items);
  if (!current || current.id === "dashboard") return [{ label: "Visão geral", href: "/admin" }];
  const parts = path.slice(current.href.length).split("/").filter(Boolean);
  const names: Record<string, string> = { novo: "Novo cadastro", editar: "Editar", preview: "Prévia", inscricoes: "Inscrições", categorias: "Categorias", palestrantes: "Palestrantes" };
  return [{ label: current.label, href: current.href }, ...(parts.length ? [{ label: names[parts.at(-1)!] || "Detalhes", href: path }] : [])];
}
export const uiPreferenceKey = "mystra.admin.ui.v1";
export type AdminPreferences = { compact: boolean; groups: Partial<Record<AdminGroup, boolean>> };
export const defaultAdminPreferences: AdminPreferences = { compact: false, groups: { content: true } };
export function adminGroupExpanded(group: AdminGroup, items: readonly AdminNavItem[], activeId: string | undefined, preferences: AdminPreferences, compact: boolean) {
  if (compact || group === "overview" || items.some(item => item.group === group && item.id === activeId)) return true;
  const preference = preferences.groups[group];
  if (typeof preference === "boolean") return preference;
  return items.find(item => item.group !== "overview")?.group === group;
}
export function parseAdminPreferences(raw: string | null): AdminPreferences {
  try {
    const value: unknown = JSON.parse(raw || "null");
    if (!value || typeof value !== "object") return defaultAdminPreferences;
    const data = value as Record<string, unknown>, groups: AdminPreferences["groups"] = { ...defaultAdminPreferences.groups };
    if (data.groups && typeof data.groups === "object") for (const group of adminGroups) { const state = (data.groups as Record<string, unknown>)[group.id]; if (typeof state === "boolean") groups[group.id] = state; }
    return { compact: data.compact === true, groups };
  } catch { return defaultAdminPreferences; }
}
export function navigationMatches(item: Pick<AdminNavItem, "label" | "group">, query: string) {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalize(`${item.label} ${adminGroups.find(g => g.id === item.group)?.label || ""}`).includes(normalize(query.trim()));
}
