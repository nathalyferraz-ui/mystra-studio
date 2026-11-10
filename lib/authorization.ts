import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, isAuthConfigured } from "./auth";
import { getDb } from "./db";
import { hasPermission } from "./permissions";
import { actorMatchesEnvironment } from "./demo-policy";
import { isDemoEnvironment } from "./environment";

export const requireUser = cache(async () => {
  const requestHeaders = await headers();
  if (isDemoEnvironment() && requestHeaders.has("next-action")) throw new Error("Demonstração somente leitura: operações administrativas indisponíveis.");
  if (!isAuthConfigured()) redirect("/admin/login?status=setup");
  let user;
  try {
    const session = await getAuth().api.getSession({ headers: requestHeaders });
    if (session) user = await getDb().user.findUnique({ where: { id: session.user.id }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  } catch {
    redirect("/admin/login?status=unavailable");
  }
  if (!user?.active || !user.roles.length || !actorMatchesEnvironment(user)) redirect("/admin/login");
  return user;
});

export async function requirePermission(permission: string) {
  const user = await requireUser();
  if (!hasPermission(user, permission)) throw new Error("Você não tem permissão para esta operação.");
  return user;
}
