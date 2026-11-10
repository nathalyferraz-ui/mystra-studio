import { release } from "@/config/release";
import { NextResponse } from "next/server";
import { authenticationValues, isDemoEnvironment } from "@/lib/environment";
import { getDb } from "@/lib/db";
import { readLimitedBody } from "@/features/media/validation";
import { leadSchema } from "@/features/crm/schema";
import { formSecret, verifyFormToken, digest } from "@/features/crm/security";
import { consumeLimit, persistLead } from "@/features/crm/persistence";
import { crmDatabaseReady } from "@/features/crm/availability";
import { privateLeadStorage, uploadLeadAttachment } from "@/features/crm/attachments";
export async function POST(request: Request) {
  if (!release.publicIntake) return Response.json({ message: "O recebimento público de dados não está disponível nesta versão." }, { status: 403 });
  if (isDemoEnvironment()) return NextResponse.json({ code: "DEMO_READ_ONLY", message: "Demonstração: não recebemos contatos ou orçamentos reais." }, { status: 403 });
  const respond = (body: object, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  let attachment: Awaited<ReturnType<typeof uploadLeadAttachment>> | undefined;
  try {
    const origin = request.headers.get("origin");
    const expected = new URL(authenticationValues().origin || request.url).origin;
    if (!origin || origin !== expected) return respond({ message: "Origem do envio não permitida." }, 403);
    const secret = formSecret();
    if (!secret || !await crmDatabaseReady()) return respond({ message: "O recebimento de mensagens está temporariamente indisponível." }, 503);
    const db = getDb();
    if (!await consumeLimit(db, "crm:global", 200, 60000)) return respond({ message: "Limite de envios atingido. Aguarde antes de tentar novamente." }, 429);
    const bytes = await readLimitedBody(request, 3 * 1024 * 1024);
    const form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type") || "" }, body: new Uint8Array(bytes) }).formData();
    const values = Object.fromEntries([...form.entries()].filter(([key]) => key !== "attachment"));
    const parsed = leadSchema.safeParse({ ...values, privacy: values.privacy === "true" });
    if (!parsed.success) return respond({ message: "Revise os campos indicados.", errors: parsed.error.flatten().fieldErrors }, 422);
    if (!verifyFormToken(parsed.data.token, secret)) return respond({ message: "A sessão do formulário expirou ou o envio foi rápido demais. Aguarde alguns segundos ou atualize a página." }, 422);
    if (!await consumeLimit(db, `crm:email:${digest(parsed.data.email, secret)}`, 5, 600000)) return respond({ message: "Limite de envios atingido. Aguarde antes de tentar novamente." }, 429);
    const file = form.get("attachment");
    if (file instanceof File && file.size) {
      if (parsed.data.type !== "ORCAMENTO") return respond({ message: "Anexos são permitidos apenas no orçamento." }, 422);
      attachment = await uploadLeadAttachment(file);
    }
    const result = await persistLead(db, parsed.data, secret, attachment);
    if (result.duplicate && attachment) { await (await privateLeadStorage()).remove([attachment.storagePath]); attachment = undefined; }
    return respond({ ok: true, message: result.duplicate ? "Esta solicitação já foi recebida. Não criamos um novo registro." : "Solicitação recebida e registrada. Obrigado por compartilhar sua ideia." }, 200);
  } catch (error) {
    // Only clean objects proven to have no committed database reference.
    if (attachment) { try { const count = await getDb().leadAttachment.count({ where: { storagePath: attachment.storagePath } }); if (!count) await (await privateLeadStorage()).remove([attachment.storagePath]); } catch { /* Leave for controlled orphan review rather than deleting a referenced object. */ } }
    const reason = error instanceof Error ? error.message : "";
    const status = reason === "Arquivo muito grande." ? 413 : reason === "SERVICE_UNAVAILABLE" ? 409 : reason === "INVALID_ATTACHMENT" ? 422 : error instanceof SyntaxError || error instanceof TypeError ? 400 : 503;
    return respond({ message: reason === "Arquivo muito grande." ? "O envio excede o tamanho permitido." : reason === "SERVICE_UNAVAILABLE" ? "O serviço selecionado não está mais disponível. Atualize a página e selecione novamente." : reason === "INVALID_ATTACHMENT" ? "Envie uma imagem JPEG, PNG ou WebP de até 2 MB." : "Não foi possível confirmar o recebimento. Confira os campos e tente novamente; envios repetidos são tratados sem duplicar registros." }, status);
  }
}
