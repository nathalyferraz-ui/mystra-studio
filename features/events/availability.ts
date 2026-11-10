import "server-only";
import { cache } from "react";
import { getDb } from "@/lib/db";
export const eventsReady = cache(async () => { try { const rows = await getDb().$queryRaw<{ ready: boolean }[]>`SELECT to_regclass('public."Event"') IS NOT NULL AND to_regclass('public."EventRegistration"') IS NOT NULL AND to_regclass('public."Speaker"') IS NOT NULL AS ready`; return rows[0]?.ready === true; } catch { return false; } });
