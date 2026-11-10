import "server-only";
import { createClient } from "@supabase/supabase-js";
import { assertDemoStorage, isDemoEnvironment } from "./environment";
export function storageConfigured() { if (isDemoEnvironment()) { try { const values = assertDemoStorage(); return !!values.key; } catch { return false; } } return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_STORAGE_BUCKET); }
export function getStorage() {
  if (!storageConfigured()) throw new Error("Configure Supabase Storage no servidor.");
  const values = isDemoEnvironment() ? assertDemoStorage() : { url: process.env.SUPABASE_URL!, key: process.env.SUPABASE_SERVICE_ROLE_KEY!, bucket: process.env.SUPABASE_STORAGE_BUCKET! };
  const client = createClient(values.url, values.key, { auth: { persistSession: false, autoRefreshToken: false } });
  return { client, bucket: values.bucket };
}
