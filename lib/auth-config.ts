import { authenticationValues, runtimeDatabaseURL } from "./environment";
export function authConfiguration(env: Record<string, string | undefined> = process.env) {
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "production") return { configured: false, reason: "preview" } as const;
  let values: ReturnType<typeof authenticationValues>;
  try { runtimeDatabaseURL(env); values = authenticationValues(env); } catch { return { configured: false, reason: "database" } as const; }
  const secret = values.secret;
  if (!secret || secret.length < 32 || /\s/.test(secret) || /^(.)\1+$/.test(secret) || /change.?me|replace.?me|your.?secret/i.test(secret)) return { configured: false, reason: "secret" } as const;
  try {
    const url = new URL(values.origin || "");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") return { configured: false, reason: "origin" } as const;
    if (env.NODE_ENV === "production" && url.protocol !== "https:") return { configured: false, reason: "https" } as const;
  } catch { return { configured: false, reason: "origin" } as const; }
  return { configured: true, reason: null } as const;
}
