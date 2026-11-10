import { release } from "@/config/release";
import { NextResponse } from "next/server";
import { authenticationValues, isDemoEnvironment } from "@/lib/environment";
import { getDb } from "@/lib/db";
import { formSecret, digest, verifyFormToken } from "@/lib/form-security";
import { consumeLimit } from "@/lib/rate-limit";
import { readLimitedBody } from "@/features/media/validation";
import { eventRegistrationSchema } from "@/features/events/schema";
import { eventsReady } from "@/features/events/availability";
import { registerForEvent } from "@/features/events/repository";
export async function POST(request: Request) {
  if (!release.publicIntake) return Response.json({ message: "O recebimento público de dados não está disponível nesta versão." }, { status: 403 });
  if (isDemoEnvironment()) return NextResponse.json({ code: "DEMO_READ_ONLY", message: "Eventos demonstrativos: inscrições públicas indisponíveis." }, { status: 403 });
  const response = (data: object, status: number) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
  try {
    if (request.headers.get("origin") !== new URL(authenticationValues().origin || request.url).origin) return response({ message: "Origem não permitida." }, 403);
    const base = formSecret(); if (!base || !await eventsReady()) return response({ message: "Inscrições temporariamente indisponíveis." }, 503);
    const db = getDb(); if (!await consumeLimit(db, "events:global", 120, 60000)) return response({ message: "Aguarde antes de tentar novamente." }, 429);
    const bytes = await readLimitedBody(request, 16000); const parsed = eventRegistrationSchema.safeParse(JSON.parse(bytes.toString("utf8")));
    if (!parsed.success) return response({ message: "Confira os dados e a ciência do aviso.", errors: parsed.error.flatten().fieldErrors }, 422);
    const secret = digest("event-registrations", base);
    if (!verifyFormToken(parsed.data.token, secret)) return response({ message: "Formulário expirado ou envio rápido demais. Aguarde alguns segundos ou atualize a página." }, 422);
    if (!await consumeLimit(db, `events:email:${digest(parsed.data.email, secret)}`, 5, 600000)) return response({ message: "Limite de tentativas atingido. Tente novamente mais tarde." }, 429);
    const result = await registerForEvent(db, { eventId: parsed.data.eventId, name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone });
    const messages: Record<string, string> = { RECEIVED: "Inscrição recebida e registrada. Nenhum e-mail de confirmação foi enviado.", EXISTS: "Já existe uma inscrição para este e-mail neste evento. Um novo registro não foi criado; inscrições canceladas precisam de revisão administrativa.", CLOSED: "Inscrições encerradas ou evento indisponível.", NOT_YET: "O período de inscrições ainda não começou.", FULL: "Evento lotado. Não há lista de espera nesta etapa.", CANCELED: "Este evento foi cancelado." };
    return response({ ok: result.code === "RECEIVED", code: result.code, message: messages[result.code] }, ["RECEIVED", "EXISTS"].includes(result.code) ? 200 : 409);
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : error instanceof Error && error.message === "Arquivo muito grande." ? 413 : 503;
    return response({ message: "Não foi possível confirmar sua inscrição. Tente novamente; tentativas repetidas não criam inscrições duplicadas." }, status);
  }
}
