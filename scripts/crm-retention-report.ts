import "dotenv/config";
import { getDb } from "../lib/db";
async function main() {
  const days = Number(process.env.CRM_RETENTION_REVIEW_DAYS);
  if (!Number.isInteger(days) || days < 1 || days > 36500) throw new Error();
  const db = getDb();
  try {
    const cutoff = new Date(Date.now() - days * 86400000);
    const [leads, attachments] = await Promise.all([
      db.lead.count({ where: { status: "ARQUIVADO", updatedAt: { lt: cutoff } } }),
      db.leadAttachment.count({ where: { lead: { status: "ARQUIVADO", updatedAt: { lt: cutoff } } } }),
    ]);
    console.log(JSON.stringify({ reviewBefore: cutoff.toISOString(), archivedRequestsForReview: leads, associatedFilesForReview: attachments, deleted: 0 }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Informe CRM_RETENTION_REVIEW_DAYS e confira a conexão/tabelas. O relatório é somente de leitura e não exibe dados pessoais."); process.exitCode = 1; });
