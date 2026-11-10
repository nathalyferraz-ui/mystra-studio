import { release } from "@/config/release";
import { NextResponse } from "next/server";
import { authenticationValues } from "@/lib/environment";
import { getDb } from "@/lib/db";
import { createHmac } from "node:crypto";
import { careersConfig, syntheticApplication } from "@/features/careers/config";
import { intakeConfigured } from "@/features/careers/availability";
import { careerStorageConfigured, uploadResume, cleanupUnreferencedResume } from "@/features/careers/storage";
import { validateResume } from "@/features/careers/pdf";
import { applicationSchema } from "@/features/careers/schema";
import { submitApplicationRecord } from "@/features/careers/repository";
import { readLimitedBody } from "@/features/media/validation";
import { formSecret, digest, verifyFormToken } from "@/lib/form-security";
import { consumeLimit } from "@/lib/rate-limit";
import { apiPermission } from "@/lib/api-authorization";
import { jobAcceptsApplications } from "@/features/careers/rules";
export async function POST(request: Request) {
  if (!release.publicIntake) return Response.json({ message: "O recebimento público de dados não está disponível nesta versão." }, { status: 403 });
  const respond = (data: object, status: number) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
  const config = careersConfig();
  // This guard intentionally precedes body parsing, storage and database writes.
  if (config.mode === "demo") return respond({ code: "DEMO_MODE", message: "Projeto demonstrativo: não há contratações reais e não recebemos dados pessoais ou currículos." }, 403);
  let resume: Awaited<ReturnType<typeof uploadResume>> | undefined;
  try {
    if (request.headers.get("origin") !== new URL(authenticationValues().origin || request.url).origin) return respond({ message: "Origem não permitida." }, 403);
    if (!await intakeConfigured() || !careerStorageConfigured()) return respond({ message: "O recebimento não está habilitado. Não envie dados ou documentos reais." }, 503);
    if (config.mode === "test" && !await apiPermission(request, "recruitment:manage")) return respond({ message: "Testes de candidaturas exigem um operador autenticado com permissão de recrutamento." }, 403);
    const db = getDb(); if (!await consumeLimit(db, "careers:global", 60, 60000)) return respond({ message: "Limite de tentativas. Aguarde antes de tentar novamente." }, 429);
    const bytes = await readLimitedBody(request, config.maxCVBytes + 65536);
    const form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type") || "" }, body: new Uint8Array(bytes) }).formData();
    const fields = Object.fromEntries([...form.entries()].filter(([key]) => key !== "resume")); const parsed = applicationSchema.safeParse({ ...fields, privacy: fields.privacy === "true" });
    if (!parsed.success) return respond({ message: "Revise os campos e o aviso de privacidade.", errors: parsed.error.flatten().fieldErrors }, 422);
    const secret = digest("careers-applications", formSecret()!);
    if (!verifyFormToken(parsed.data.token, secret)) return respond({ message: "Formulário expirado ou envio rápido demais. Aguarde ou atualize a página." }, 422);
    if (config.mode === "test" && !syntheticApplication(parsed.data)) return respond({ message: "O ambiente controlado aceita apenas nomes iniciados por Teste e e-mails @example.test." }, 422);
    if (!await consumeLimit(db, `careers:email:${createHmac("sha256", secret).update(parsed.data.email).digest("hex")}`, 3, 600000)) return respond({ message: "Aguarde antes de tentar novamente." }, 429);
    const job = await db.job.findUnique({ where: { id: parsed.data.jobId }, select: { status: true, publishedAt: true, deadline: true } });
    if (!job || !jobAcceptsApplications(job)) return respond({ code: "CLOSED", message: "A vaga não está disponível para candidaturas." }, 409);
    const file = form.get("resume"); if (!(file instanceof File)) return respond({ message: "Selecione um currículo PDF válido." }, 422);
    const content = Buffer.from(await file.arrayBuffer()); const pdf = await validateResume(content, file.name, file.type, config.maxCVBytes);
    if (config.mode === "test" && !pdf.synthetic) return respond({ message: "Use apenas o PDF sintético fornecido no ambiente controlado." }, 422);
    resume = await uploadResume(content, file.name);
    const result = await submitApplicationRecord(db, parsed.data, resume, config.mode === "test", config.retentionDays!);
    if (result.code !== "RECEIVED") await cleanupUnreferencedResume(resume.resumePath);
    return respond({ ok: result.code === "RECEIVED", code: result.code, message: result.code === "RECEIVED" ? "Candidatura registrada. Nenhum e-mail foi enviado; o registro não representa contratação." : result.code === "EXISTS" ? "Já existe uma candidatura para este e-mail nesta vaga. Não criamos um segundo registro." : "A vaga não está disponível para candidaturas." }, result.code === "CLOSED" ? 409 : 200);
  } catch (error) {
    if (resume) await cleanupUnreferencedResume(resume.resumePath);
    const code = error instanceof Error ? error.message : "";
    return respond({ message: code === "INVALID_PDF" ? "PDF inválido, protegido, com conteúdo ativo ou fora dos limites. Envie um documento estático dentro do tamanho permitido." : code === "PDF_VALIDATOR_BUSY" ? "A validação de arquivos está ocupada. Aguarde antes de tentar novamente." : code === "Arquivo muito grande." ? "O envio excede o tamanho permitido." : "Não foi possível confirmar a candidatura. Confira a configuração e tente novamente." }, code === "INVALID_PDF" ? 422 : code === "Arquivo muito grande." ? 413 : 503);
  }
}
