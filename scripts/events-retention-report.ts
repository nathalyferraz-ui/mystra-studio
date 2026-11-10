import "dotenv/config";
import { getDb } from "../lib/db";
async function main() {
  const days = Number(process.env.EVENT_REGISTRATION_REVIEW_DAYS);
  if (!Number.isInteger(days) || days < 1 || days > 36500) throw new Error();
  const db = getDb();
  try {
    const cutoff = new Date(Date.now() - days * 86400000);
    const where = { endsAt: { lt: cutoff } };
    const [events, registrations] = await Promise.all([db.event.count({ where }), db.eventRegistration.count({ where: { event: where } })]);
    console.log(JSON.stringify({ reviewEventsEndedBefore: cutoff.toISOString(), eventsForReview: events, registrationsForReview: registrations, deleted: 0 }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error("Configure EVENT_REGISTRATION_REVIEW_DAYS e confira a conexão. Este relatório não exibe participantes e não exclui dados."); process.exitCode = 1; });
