import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { careersConfig } from "./config";
import { formSecret } from "@/lib/form-security";
export const careersReady = cache(async () => { try { const rows = await getDb().$queryRaw<{ ready: boolean }[]>`SELECT to_regclass('public."Job"') IS NOT NULL AND to_regclass('public."JobApplication"') IS NOT NULL AND to_regclass('public."ApplicationActivity"') IS NOT NULL AS ready`; return rows[0]?.ready === true; } catch { return false; } });
export async function intakeConfigured() {
  const config = careersConfig();
  if (!config.configured || !formSecret() || !await careersReady()) return false;
  if (config.mode === "test") {
    const marker = (await getDb().institutionalSetting.findUnique({ where: { key: "careers.controlled-test" } }))?.value;
    return !!marker && typeof marker === "object" && !Array.isArray(marker) && marker.enabled === true;
  }
  return config.mode === "live";
}
