import "dotenv/config";
import { productionReadiness } from "../lib/production-readiness";
const report = productionReadiness(process.env);
for (const blocker of report.blockers) console.error(`BLOQUEIO: ${blocker}`);
for (const warning of report.warnings) console.log(`AVISO: ${warning}`);
console.log("Verificação local de configuração: nenhuma conexão, migration ou operação no banco foi executada. Nenhum valor secreto foi exibido.");
if (report.blockers.length) process.exitCode = 1;
else console.log("Configuração mínima de produção aprovada. Conectividade, conteúdo e login no domínio publicado ainda precisam de conferência.");
