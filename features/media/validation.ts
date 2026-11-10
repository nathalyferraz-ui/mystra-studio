import sharp from "sharp";
export const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
export async function normalizeImage(bytes: Buffer, mime: string) {
  const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (!formats[mime] || !bytes.length || bytes.length > MAX_UPLOAD_SIZE) throw new Error("Envie JPEG, PNG ou WebP de até 8 MB.");
  const signatureMatches = mime === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : mime === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!signatureMatches) throw new Error("A assinatura do arquivo não corresponde ao formato informado.");
  const metadata = await sharp(bytes, { limitInputPixels: 25000000, failOn: "warning" }).metadata();
  if (metadata.format !== formats[mime] || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw new Error("Imagem inválida ou animada. Envie uma imagem estática.");
  const { data, info } = await sharp(bytes, { limitInputPixels: 25000000, failOn: "warning" }).rotate().resize({ width: 2560, height: 2560, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, mimeType: "image/webp", size: data.length };
}
export async function readLimitedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length")) > limit) throw new Error("Arquivo muito grande.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Arquivo ausente.");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new Error("Arquivo muito grande."); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
