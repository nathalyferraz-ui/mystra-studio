import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { X509Certificate } from "node:crypto";
import { parse } from "dotenv";
import { inspectDemoConnections } from "../lib/demo-connection-check";

try {
  const file = ".env.demo", original = readFileSync(file, "utf8"), demo = parse(original), primary = parse(readFileSync(".env", "utf8"));
  inspectDemoConnections(primary, demo);
  const rootPath = resolve("prisma/certificates/supabase-root-2021.crt").replaceAll("\\", "/");
  const certificate = new X509Certificate(readFileSync(rootPath));
  if (!certificate.ca || !/supabase/i.test(certificate.subject) || Date.parse(certificate.validTo) <= Date.now() || Date.parse(certificate.validFrom) > Date.now()) throw new Error("INVALID_CA");
  let next = original;
  for (const key of ["DEMO_DATABASE_URL", "DEMO_DIRECT_URL"]) {
    const url = new URL(demo[key]);
    url.searchParams.set("sslmode", "verify-full"); url.searchParams.set("sslrootcert", rootPath);
    demo[key] = url.toString();
    const pattern = new RegExp(`^${key}=.*$`, "gm");
    if ([...original.matchAll(pattern)].length !== 1) throw new Error("DUPLICATE_VARIABLE");
    next = next.replace(pattern, () => `${key}="${demo[key]}"`);
  }
  inspectDemoConnections(primary, demo);
  if (next !== original) writeFileSync(file, next);
  console.log("CA Supabase configurada somente nas URLs demo, com verify-full. Nenhuma conexão ou alteração no banco foi executada.");
  console.log(`Fingerprint SHA-256 do certificado público: ${certificate.fingerprint256}`);
} catch {
  console.error("Configuração TLS não concluída. Salve o certificado CA público obtido no painel Supabase em prisma/certificates/supabase-root-2021.crt e confira os destinos com demo:check. Não foi desativada a verificação TLS.");
  process.exitCode = 1;
}
