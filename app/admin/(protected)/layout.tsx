import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { AdminLoadingState } from "@/components/admin/primitives";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { adminModules } from "@/config/navigation";
import { adminNavigation, permittedQuickActions } from "@/features/admin/navigation";
import { demoNavigation } from "@/features/demo/navigation";
import { isDemoEnvironment } from "@/lib/environment";
import "@/features/institutional/institutional.css";
import "@/features/admin/admin.css";
import "@/features/demo/demo.css";
// Entering this workspace must wait for session validation or a login redirect.
export const instant = false;
async function ProtectedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const modules = adminModules.filter(item => hasPermission(user, item.permission) && (item.slug !== "permissoes" || user.roles.some(r => r.role.code === "ADMIN")));
  const roleNames: Record<string, string> = { ADMIN: "Administração", EDITOR: "Edição de conteúdo", COMERCIAL: "Atendimento comercial" };
  const role = user.roles.map(item => roleNames[item.role.code] || item.role.code).join(" · ");
  const demo = isDemoEnvironment();
  return <AdminShell demo={demo} user={{ name: user.name, email: user.email, role: demo ? "Exploração · somente leitura" : role }} items={demo ? demoNavigation() : adminNavigation(modules)} actions={demo ? [] : permittedQuickActions(user)}>{children}</AdminShell>;
}
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <Suspense fallback={<AdminLoadingState />}><ProtectedShell>{children}</ProtectedShell></Suspense>; }
