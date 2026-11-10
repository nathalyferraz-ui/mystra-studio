import { environmentMode, type EnvironmentValues } from "./environment";
type Actor = { active: boolean; email?: string; roles: { role: { code: string; permissions: { permission: { code: string } }[] } }[] };
export function reservedDemoEmail(email: string) { return /^[a-z0-9._+-]+@(example\.com|example\.test)$/i.test(email); }
export function isDemoActor(user: Actor) { return user.roles.some(r => r.role.permissions.some(p => p.permission.code === "demo:explore")); }
export function actorMatchesEnvironment(user: Actor, env: EnvironmentValues = process.env) {
  return user.active && (environmentMode(env) === "demo" ? isDemoActor(user) && reservedDemoEmail(user.email || "") : !isDemoActor(user));
}
export function demoAuthPathAllowed(path: string) { return ["/api/auth/sign-in/email", "/api/auth/get-session", "/api/auth/sign-out"].includes(path); }
export function assertDemoQuery(model: string | undefined, operation: string, args: unknown) {
  const forbidden = ["JobApplication", "ApplicationNote", "ApplicationActivity", "LeadAttachment", "Verification"];
  if (model && forbidden.includes(model)) throw new Error("DEMO_PRIVATE_RESOURCE");
  if (["$executeRaw", "$executeRawUnsafe", "$queryRawUnsafe"].includes(operation)) throw new Error("DEMO_READ_ONLY");
  if (operation.startsWith("find") || ["count", "aggregate", "groupBy", "$queryRaw"].includes(operation)) return;
  if (model === "Session" || model === "RateLimit") return;
  const data = args && typeof args === "object" && "data" in args ? (args as { data: unknown }).data : undefined;
  if (model === "AdminLog" && operation === "create" && data && typeof data === "object" && "action" in data && data.action === "auth.login") return;
  throw new Error("DEMO_READ_ONLY");
}
