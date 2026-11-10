export const privacyVersion = "careers-2026-11-v1";
export function careersConfig(env: Record<string, string | undefined> = process.env) {
  const raw = isDemoEnvironment(env) ? "demo" : env.CAREERS_MODE;
  const mode = raw === "live" ? "live" : raw === "test" && env.NODE_ENV !== "production" && env.CAREERS_CONTROLLED_TEST === "true" ? "test" : "demo";
  const days = Number(env.CAREERS_RETENTION_DAYS), mb = Number(env.CAREERS_MAX_CV_MB || 5);
  const retentionDays = Number.isInteger(days) && days >= 1 && days <= 3650 ? days : null;
  const maxCVBytes = (Number.isInteger(mb) && mb >= 1 && mb <= 10 ? mb : 5) * 1024 * 1024;
  const reviewed = env.CAREERS_PRIVACY_REVIEWED === "true" && env.CAREERS_SECURITY_REVIEWED === "true" && Boolean(env.CAREERS_CONTROLLER_NAME?.trim()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.CAREERS_PRIVACY_CONTACT_EMAIL || "");
  return { mode, retentionDays, maxCVBytes, configured: mode !== "demo" && retentionDays !== null && (mode === "test" || reviewed) } as const;
}
export function syntheticApplication(data: { name: string; email: string }) { return data.name.startsWith("Teste ") && data.email.endsWith("@example.test"); }
import { isDemoEnvironment } from "@/lib/environment";
