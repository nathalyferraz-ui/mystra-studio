import { spawn } from "node:child_process";
import { loadIsolatedEnvironment } from "./lib/isolated-environment";
import { isolatedDatabase } from "../lib/environment";
import { authConfiguration } from "../lib/auth-config";
import { readdirSync } from "node:fs";
import { assertIsolatedTestDatabase } from "../lib/test-database";

try {
  const [kind, command] = process.argv.slice(2);
  if (kind !== "demo" && kind !== "homologation") throw new Error("INVALID_ENVIRONMENT");
  const cli = ["validate", "status", "migrate-deploy"].includes(command);
  const env = loadIsolatedEnvironment(kind, cli ? "owner" : "runtime");
  if (command === "build" || command === "start") env.NODE_ENV = "production";
  const commands: Record<string, string[]> = { dev: ["node_modules/next/dist/bin/next", "dev", "-p", kind === "demo" ? "3001" : "3002"], build: ["node_modules/next/dist/bin/next", "build"], start: ["node_modules/next/dist/bin/next", "start", "-p", kind === "demo" ? "3001" : "3002"], validate: ["node_modules/prisma/build/index.js", "validate"], status: ["node_modules/prisma/build/index.js", "migrate", "status"], "migrate-deploy": ["node_modules/prisma/build/index.js", "migrate", "deploy"], "integration-test": ["node_modules/tsx/dist/cli.mjs", "--test", ...readdirSync("tests").filter(name => name.endsWith(".integration.test.ts")).map(name => `tests/${name}`)] };
  if (!Object.hasOwn(commands, command)) throw new Error("COMMAND_NOT_ALLOWED");
  if (command === "integration-test") { if (kind !== "homologation") throw new Error("TESTS_REQUIRE_HOMOLOGATION"); assertIsolatedTestDatabase(env); }
  else if (!cli && !authConfiguration(env).configured) throw new Error("ISOLATED_AUTH_CONFIGURATION_REQUIRED");
  if (command === "migrate-deploy") { const target = isolatedDatabase(kind, "owner", env); if (env[`${kind === "demo" ? "DEMO" : "HOMOLOG"}_MIGRATIONS_CONFIRM`] !== target.projectRef) throw new Error("EXPLICIT_MIGRATION_AUTHORIZATION_REQUIRED"); }
  const child = spawn(process.execPath, commands[command], { env: env as NodeJS.ProcessEnv, stdio: "inherit", windowsHide: true });
  child.on("error", () => { console.error("Não foi possível iniciar o processo isolado."); process.exitCode = 1; });
  child.on("exit", code => { process.exitCode = code ?? 1; });
} catch {
  console.error("Operação recusada antes da conexão. Configure o arquivo isolado, identidades distintas e credenciais próprias. Revise a autorização explícita para migrations; nenhum valor de conexão foi registrado.");
  process.exitCode = 1;
}
