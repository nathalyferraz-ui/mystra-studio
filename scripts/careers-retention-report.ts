import "dotenv/config";
import { getDb } from "../lib/db";
async function main() { const db = getDb(); try { const [expired, pending] = await Promise.all([db.jobApplication.count({ where: { retentionUntil: { lte: new Date() } } }), db.jobApplication.count({ where: { deletingAt: { not: null } } })]); console.log(JSON.stringify({ expiredForReview: expired, pendingPurges: pending, deleted: 0 })); } finally { await db.$disconnect(); } }
main().catch(() => { console.error("Confira a conexão e a migration Careers. O relatório não exibe dados pessoais nem exclui registros."); process.exitCode = 1; });
