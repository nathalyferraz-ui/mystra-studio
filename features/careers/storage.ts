import "server-only";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHash } from "node:crypto";
import { getDb } from "@/lib/db";
export function careerStorageConfigured() { const bucket = process.env.SUPABASE_CAREERS_BUCKET; return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && bucket && bucket !== process.env.SUPABASE_STORAGE_BUCKET && bucket !== process.env.SUPABASE_LEADS_BUCKET); }
export async function privateCareerStorage() {
  if (!careerStorageConfigured()) throw new Error("STORAGE_UNAVAILABLE");
  const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }); const bucket = process.env.SUPABASE_CAREERS_BUCKET!;
  const { data, error } = await client.storage.getBucket(bucket); if (error || !data || data.public) throw new Error("STORAGE_UNAVAILABLE");
  return client.storage.from(bucket);
}
export async function uploadResume(bytes: Buffer, originalName: string) {
  const storage = await privateCareerStorage(), path = `resumes/${randomUUID()}.pdf`;
  const { error } = await storage.upload(path, bytes, { contentType: "application/pdf", upsert: false, cacheControl: "0" }); if (error) throw new Error("STORAGE_UNAVAILABLE");
  return { resumePath: path, resumeName: originalName.replace(/[\x00-\x1f\x7f/\\]/g, "_").slice(-180), resumeSize: bytes.length, resumeHash: createHash("sha256").update(bytes).digest("hex") };
}
export async function cleanupUnreferencedResume(path: string) {
  try {
    if (await getDb().jobApplication.count({ where: { resumePath: path } })) return;
    const { error } = await (await privateCareerStorage()).remove([path]); if (error) throw new Error();
  } catch {
    try { await getDb().adminLog.create({ data: { action: "careers.resume.cleanup_review", resource: path } }); } catch { /* Uncertain files are retained for controlled inventory, never removed blindly. */ }
  }
}
