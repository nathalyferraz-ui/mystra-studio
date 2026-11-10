import "server-only";
import { getAuth, isAuthConfigured } from "./auth";
import { getDb } from "./db";
import { hasPermission } from "./permissions";
import { actorMatchesEnvironment } from "./demo-policy";
import { authenticationValues } from "./environment";
export async function apiUser(requestHeaders: Headers) {
  if (!isAuthConfigured()) return null;
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const user = await getDb().user.findUnique({ where: { id: session.user.id }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  return user?.active && actorMatchesEnvironment(user) ? user : null;
}
export async function apiPermission(request: Request, permission: string) {
  const user = await apiUser(request.headers); return user && hasPermission(user, permission) ? user : null;
}
export async function apiEditor(request: Request) { return apiPermission(request, "content:manage"); }
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = authenticationValues().origin;
  return Boolean(origin && expected && origin === new URL(expected).origin);
}
