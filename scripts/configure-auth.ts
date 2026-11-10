import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { prepareAuthEnvironment } from "../lib/auth-environment";

try {
  // Higher-priority Next environment files must be reviewed rather than silently overridden.
  if ([".env.local", ".env.development", ".env.development.local"].some(existsSync)) throw new Error("REVIEW_OVERRIDES");
  const target = resolve(".env"), source = readFileSync(target, "utf8");
  const result = prepareAuthEnvironment(source);
  if (result.contents !== source) writeFileSync(target, result.contents, { encoding: "utf8", mode: 0o600 });
  console.log(result.secretCreated ? "Segredo criptográfico gerado e salvo somente no .env local. Nenhum valor foi exibido." : "Segredo existente preservado. Nenhum valor foi exibido.");
  console.log(result.originAdded ? "Origem local padrão configurada. Reinicie npm run dev." : "Origem existente preservada. Reinicie npm run dev se a configuração mudou.");
  console.log("Nenhum usuário foi criado e nenhuma conexão ou migration foi executada.");
} catch {
  console.error("Configuração recusada. Confira o .env existente, DATABASE_URL, variáveis duplicadas, segredo/origem válidos e arquivos .env de maior prioridade. Valores existentes não são rotacionados automaticamente.");
  process.exitCode = 1;
}
