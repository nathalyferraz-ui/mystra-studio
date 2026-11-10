import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { getDb } from "../lib/db";
import { authConfiguration } from "../lib/auth-config";
import { initializeFirstAdmin } from "../features/auth/bootstrap";
import { isDemoEnvironment } from "../lib/environment";

async function main() {
  if (isDemoEnvironment()) throw new Error("Use o cadastro restrito de demonstração; não crie ADMIN na demo.");
  if (process.env.BOOTSTRAP_ADMIN !== "true") throw new Error("Inicialização bloqueada. Execute com BOOTSTRAP_ADMIN=true somente para criar o primeiro administrador.");
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Use um terminal interativo para informar a senha com segurança.");
  if (!authConfiguration().configured) throw new Error("Configure a autenticação antes de criar o administrador.");
  const db = getDb();
  let muted = false;
  const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
  const prompt = createInterface({ input: process.stdin, output, terminal: true });
  try {
    if (await db.user.count()) throw new Error("Inicialização recusada: já existem usuários. Não é permitido elevar usuários existentes.");
    const name = await prompt.question("Nome do administrador: ");
    const email = await prompt.question("E-mail: ");
    process.stdout.write("Senha (12–128 caracteres, entrada oculta): "); muted = true;
    const password = await prompt.question("");
    muted = false; process.stdout.write("\nConfirme a senha (entrada oculta): "); muted = true;
    const confirmation = await prompt.question("");
    muted = false; process.stdout.write("\n");
    await initializeFirstAdmin(db, { name, email, password, confirmation });
    console.log("Primeiro administrador criado. Remova BOOTSTRAP_ADMIN do ambiente antes de iniciar a aplicação.");
  } finally { muted = false; prompt.close(); await db.$disconnect(); }
}
main().catch(() => { console.error("Inicialização não concluída. Verifique: banco e migrations, autorização BOOTSTRAP_ADMIN, ausência de usuários, campos válidos e senhas iguais de 12–128 caracteres. Nenhuma credencial foi registrada em logs."); process.exitCode = 1; });
