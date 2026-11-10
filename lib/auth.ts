import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getDb } from "./db";
import { authConfiguration } from "./auth-config";
import { authenticationValues, isDemoEnvironment } from "./environment";
import { actorMatchesEnvironment } from "./demo-policy";

export function isAuthConfigured() {
  return authConfiguration().configured;
}
function createAuth() {
  const values = authenticationValues();
  return betterAuth({
    appName: isDemoEnvironment() ? "Mystra Studio Demo" : "Mystra Studio",
    baseURL: values.origin!,
    secret: values.secret!,
    advanced: { ...(values.cookiePrefix ? { cookiePrefix: values.cookiePrefix } : {}), useSecureCookies: process.env.NODE_ENV === "production" || new URL(values.origin!).protocol === "https:" },
    database: prismaAdapter(getDb(), { provider: "postgresql", transaction: true }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128, revokeSessionsOnPasswordReset: true },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 60, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30, customRules: { "/sign-in/email": { window: 60, max: 5 } } },
    databaseHooks: {
      session: { create: { before: async session => {
        const user = await getDb().user.findUnique({ where: { id: session.userId }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
        if (!user?.active || !user.roles.length || !actorMatchesEnvironment(user)) return false;
        return { data: isDemoEnvironment() ? { ...session, ipAddress: "", userAgent: "" } : session };
      }, after: async session => {
        await getDb().adminLog.create({ data: { userId: session.userId, action: "auth.login", resource: "session" } });
      } } },
    },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!isAuthConfigured()) throw new Error("Autenticação indisponível: configure o ambiente.");
  instance ??= createAuth();
  return instance;
}
