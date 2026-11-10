import "server-only";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHash } from "node:crypto";
import { normalizeImage } from "@/features/media/validation";
export function leadStorageConfigured() { return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_LEADS_BUCKET && process.env.SUPABASE_LEADS_BUCKET !== process.env.SUPABASE_STORAGE_BUCKET); }
export async function privateLeadStorage() {
  if (!leadStorageConfigured()) throw new Error("STORAGE_UNAVAILABLE");
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const bucket = process.env.SUPABASE_LEADS_BUCKET!;
  const { data, error } = await client.storage.getBucket(bucket);
  if (error || !data || data.public) throw new Error("STORAGE_UNAVAILABLE");
  return client.storage.from(bucket);
}
export async function uploadLeadAttachment(file: File) {
  if (!leadStorageConfigured()) throw new Error("STORAGE_UNAVAILABLE");
  if (file.size > 2 * 1024 * 1024 || !/\.(png|jpe?g|webp)$/i.test(file.name)) throw new Error("INVALID_ATTACHMENT");
  let image;
  try { image = await normalizeImage(Buffer.from(await file.arrayBuffer()), file.type); } catch { throw new Error("INVALID_ATTACHMENT"); }
  const storage = await privateLeadStorage(); const storagePath = `quotes/${randomUUID()}.webp`;
  const { error } = await storage.upload(storagePath, image.data, { contentType: image.mimeType, upsert: false });
  if (error) throw new Error("STORAGE_UNAVAILABLE");
  return { storagePath, originalName: file.name.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(-180), mimeType: image.mimeType, size: image.size, contentHash: createHash("sha256").update(image.data).digest("hex") };
}
