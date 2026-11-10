import { getAuth, isAuthConfigured } from "@/lib/auth";
import { loginSchema } from "@/features/auth/login-schema";
import { connection } from "next/server";
import { readLimitedBody } from "@/features/media/validation";
import { isDemoEnvironment } from "@/lib/environment";
import { demoAuthPathAllowed, reservedDemoEmail } from "@/lib/demo-policy";
async function handler(request: Request) {
  await connection();
  if (isDemoEnvironment() && !demoAuthPathAllowed(new URL(request.url).pathname)) return Response.json({ message: "Operação indisponível na demonstração." }, { status: 403 });
  if (!isAuthConfigured()) return Response.json({ message: "Autenticação temporariamente indisponível." }, { status: 503 });
  try {
    let bytes: Buffer | undefined;
    if (request.method === "POST" && request.body) {
      try { bytes = await readLimitedBody(request.clone(), 8192); }
      catch { return Response.json({ message: "Envio de autenticação muito extenso ou inválido." }, { status: 413, headers: { "Cache-Control": "no-store" } }); }
    }
    if (request.method === "POST" && new URL(request.url).pathname.endsWith("/sign-in/email")) {
      let body: unknown;
      try { body = JSON.parse(bytes?.toString("utf8") || "null"); }
      catch (error) { return Response.json({ message: "Credenciais inválidas ou envio muito extenso." }, { status: error instanceof Error && error.message === "Arquivo muito grande." ? 413 : 400, headers: { "Cache-Control": "no-store" } }); }
      const credentials = loginSchema.safeParse(body);
      if (!credentials.success || isDemoEnvironment() && !reservedDemoEmail(credentials.data.email)) return Response.json({ message: "Credenciais inválidas." }, { status: 400 });
    }
    return await getAuth().handler(request);
  }
  catch { return Response.json({ message: "Não foi possível processar a autenticação." }, { status: 503 }); }
}
export { handler as GET, handler as POST };
