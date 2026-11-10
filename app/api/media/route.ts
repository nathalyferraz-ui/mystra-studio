import { randomUUID } from "node:crypto";
import { isDemoEnvironment } from "@/lib/environment";
import { z } from "zod";
import { apiEditor, isSameOrigin } from "@/lib/api-authorization";
import { getDb } from "@/lib/db";
import { getStorage, storageConfigured } from "@/lib/storage";
import { normalizeImage, readLimitedBody, MAX_UPLOAD_SIZE } from "@/features/media/validation";
import { compensateUncommittedObject } from "@/features/media/compensation";
export async function POST(request: Request) {
  if (isDemoEnvironment()) return Response.json({ message: "Uploads indisponíveis no modo de exploração." }, { status: 403 });
  if (!isSameOrigin(request)) return Response.json({ message: "Origem não autorizada." }, { status: 403 });
  try {
    const user = await apiEditor(request);
    if (!user) return Response.json({ message: "Acesso restrito a editores autenticados." }, { status: 403 });
    if (!storageConfigured()) return Response.json({ message: "Configure Supabase Storage antes de enviar arquivos." }, { status: 503 });
    let form: FormData;
    try { const bytes = await readLimitedBody(request, MAX_UPLOAD_SIZE + 65536); form = await new Response(bytes, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData(); }
    catch { return Response.json({ message: "Envio inválido. O limite é 8 MB por imagem." }, { status: 400 }); }
    const file = form.get("file");
    const meta = z.object({ name: z.string().trim().min(1).max(180), alt: z.string().trim().min(1).max(300) }).safeParse({ name: form.get("name"), alt: form.get("alt") });
    if (!(file instanceof File) || !meta.success) return Response.json({ message: "Informe arquivo, nome e descrição alternativa." }, { status: 400 });
    let image;
    try { image = await normalizeImage(Buffer.from(await file.arrayBuffer()), file.type); }
    catch { return Response.json({ message: "Imagem inválida. Use JPEG, PNG ou WebP estático de até 8 MB e 25 megapixels." }, { status: 400 }); }
    const { client, bucket } = getStorage();
    const bucketInfo = await client.storage.getBucket(bucket);
    if (bucketInfo.error || bucketInfo.data.public) return Response.json({ message: "Configure um bucket privado existente para proteger imagens de rascunhos." }, { status: 503 });
    const storagePath = `images/${randomUUID()}.webp`;
    const uploaded = await client.storage.from(bucket).upload(storagePath, image.data, { contentType: image.mimeType, upsert: false, cacheControl: "0" });
    if (uploaded.error) return Response.json({ message: "O armazenamento recusou o upload. Verifique a configuração do bucket." }, { status: 503 });
    try {
      const media = await getDb().$transaction(async tx => {
        const item = await tx.media.create({ data: { ...meta.data, storagePath, mimeType: image.mimeType, size: image.size, width: image.width, height: image.height, uploadedById: user.id } });
        await tx.adminLog.create({ data: { userId: user.id, action: "media.upload", resource: item.id } });
        return item;
      });
      return Response.json({ id: media.id, name: media.name, alt: media.alt }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch {
      await compensateUncommittedObject({
        references: () => getDb().media.count({ where: { storagePath } }),
        remove: async () => { const result = await client.storage.from(bucket).remove([storagePath]); if (result.error) throw new Error("CLEANUP_UNCONFIRMED"); },
        onUncertain: async () => { await getDb().adminLog.create({ data: { userId: user.id, action: "media.upload.cleanup_review", resource: storagePath } }); },
      });
      return Response.json({ message: "Não foi possível confirmar o registro da imagem. Verifique a biblioteca antes de reenviar; arquivos com referência ou resultado incerto são preservados." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  } catch { return Response.json({ message: "Não foi possível processar o upload." }, { status: 503 }); }
}
