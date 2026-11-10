import { readFileSync, existsSync } from "node:fs";
import { parse } from "dotenv";
import { isolatedProcessEnvironment } from "../../lib/isolated-process";
import { assertDistinctAuthentication } from "../../lib/environment";
export function loadIsolatedEnvironment(kind: "demo" | "homologation", purpose: "runtime" | "owner" = "runtime") {
  if ([".env.local", ".env.development", ".env.development.local", ".env.production", ".env.production.local"].some(existsSync)) throw new Error("REVIEW_HIGHER_PRIORITY_ENV_FILES");
  const main = parse(readFileSync(".env", "utf8"));
  const isolated = parse(readFileSync(kind === "demo" ? ".env.demo" : ".env.homologacao", "utf8"));
  const otherFile = kind === "demo" ? ".env.homologacao" : ".env.demo", otherKey = kind === "demo" ? "HOMOLOG_SUPABASE_PROJECT_REF" : "DEMO_SUPABASE_PROJECT_REF";
  if (existsSync(otherFile)) {
    const otherValues = parse(readFileSync(otherFile, "utf8")), other = otherValues[otherKey];
    if (other) { if (isolated[otherKey] && isolated[otherKey] !== other) throw new Error("OTHER_PROJECT_MISMATCH"); isolated[otherKey] = other; }
    const prefix = kind === "demo" ? "DEMO" : "HOMOLOG", otherPrefix = kind === "demo" ? "HOMOLOG" : "DEMO";
    assertDistinctAuthentication({ secret: isolated[`${prefix}_BETTER_AUTH_SECRET`], origin: isolated[`${prefix}_BETTER_AUTH_URL`] }, { secret: otherValues[`${otherPrefix}_BETTER_AUTH_SECRET`], origin: otherValues[`${otherPrefix}_BETTER_AUTH_URL`] });
  }
  return isolatedProcessEnvironment(kind, main, isolated, process.env, purpose);
}
