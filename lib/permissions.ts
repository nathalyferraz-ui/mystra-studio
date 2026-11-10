export type AccessUser = { active: boolean; email?: string; roles: { role: { code: string; permissions: { permission: { code: string } }[] } }[] };
export function hasPermission(user: AccessUser, permission: string, env: EnvironmentValues = typeof process === "undefined" ? {} : process.env) {
  if (!actorMatchesEnvironment(user, env)) return false;
  if (environmentMode(env) === "demo") return permission === "demo:explore";
  const allowed = (code: string) => user.roles.some(({ role }) => role.code === "ADMIN" || role.permissions.some(p => p.permission.code === code));
  return user.active && (allowed(permission) || permission === "pages:read" && ["pages:update", "pages:publish", "content:manage"].some(allowed) || permission === "pages:update" && allowed("content:manage") || permission === "institutional:manage" && allowed("content:manage"));
}
import { actorMatchesEnvironment } from "./demo-policy";
import { environmentMode, type EnvironmentValues } from "./environment";
