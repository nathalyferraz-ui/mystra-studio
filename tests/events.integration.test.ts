import { assertIsolatedTestDatabase } from "../lib/test-database";
import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { eventSchema } from "../features/events/schema";
import { eventPublicSelect } from "../features/events/queries";
import { saveEventRecord, registerForEvent, changeRegistrationRecord, deleteEventRecord } from "../features/events/repository";
const url = process.env.TEST_DATABASE_URL;
test("Events PostgreSQL: publication, concurrent capacity, duplicates, history and private projection", { skip: !url, timeout: 120000 }, async () => {
  assertIsolatedTestDatabase();
  const schema = `mystra_test_${randomUUID().replaceAll("-", "")}`; assert.match(schema, /^mystra_test_[a-f0-9]{32}$/);
  const setup = new Pool({ connectionString: url, max: 1, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 }); let db: PrismaClient | undefined, pool: Pool | undefined;
  try {
    await setup.query(`CREATE SCHEMA "${schema}"`); await setup.query(`SET search_path TO "${schema}"`);
    for (const migration of ["20261105000000_postgresql_cms", "20261105010000_commercial_crm", "20261105020000_events_workshops"]) { const sql = await readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"); await setup.query(sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', "")); }
    pool = new Pool({ connectionString: url, max: 5, options: `-c search_path=${schema}`, connectionTimeoutMillis: 5000 }); db = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) }); const client = db;
    const user = await db.user.create({ data: { name: "Isolated operator", email: "operator@example.test" } });
    const date = new Date(Date.now() + 86400000), end = new Date(+date + 7200000);
    const input = eventSchema.parse({ title: "Isolated event", slug: "isolated-event", summary: "Only exists in an independent test schema.", description: "An isolated integration test for event transactions and concurrency.", objectives: "", audience: "", topics: [], additionalInfo: "", privateAccess: "https://private-meeting.example.test/secret", startsAt: date.toISOString(), endsAt: end.toISOString(), timezone: "UTC", mode: "ONLINE", location: "", capacity: 2, registrationOpen: true, registrationStartsAt: "", registrationEndsAt: "", status: "DRAFT", featured: false, categoryId: "", coverId: "", speakerIds: [], gallery: [], schedule: [], seoTitle: "", seoDescription: "" });
    const id = await saveEventRecord(db, input, user.id); assert.equal(await db.event.count({ where: { id, status: "PUBLISHED" } }), 0);
    await saveEventRecord(db, { ...input, id, version: 1, status: "PUBLISHED" }, user.id);
    const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => registerForEvent(client, { eventId: id, name: "Isolated participant", email: `participant-${i}@example.test`, phone: "" })));
    assert.equal(responses.filter(r => r.code === "RECEIVED").length, 2); assert.equal(await db.eventRegistration.count({ where: { eventId: id } }), 2);
    const participant = await db.eventRegistration.findFirstOrThrow({ where: { eventId: id } }); assert.equal((await registerForEvent(db, { eventId: id, name: participant.name, email: participant.email, phone: "" })).code, "EXISTS");
    await changeRegistrationRecord(db, participant.id, 1, "CANCELADA", user.id);
    assert.equal((await registerForEvent(db, { eventId: id, name: "Another participant", email: "replacement@example.test", phone: "" })).code, "RECEIVED");
    await assert.rejects(saveEventRecord(db, { ...input, id, version: 2, status: "PUBLISHED", capacity: 1 }, user.id));
    await assert.rejects(changeRegistrationRecord(db, participant.id, 1, "CONFIRMADA", user.id));
    const publicRow = await db.event.findUniqueOrThrow({ where: { id }, select: eventPublicSelect }); assert.equal("privateAccess" in publicRow, false); assert.equal("registrations" in publicRow, false);
    await saveEventRecord(db, { ...input, id, version: 2, status: "CANCELED", registrationOpen: false }, user.id);
    assert.equal((await registerForEvent(db, { eventId: id, name: "Blocked participant", email: "blocked@example.test", phone: "" })).code, "CANCELED");
    await assert.rejects(deleteEventRecord(db, id, 3, input.title, user.id));
    await saveEventRecord(db, { ...input, id, version: 3, status: "ARCHIVED", registrationOpen: false }, user.id); assert.equal(await db.eventRegistration.count({ where: { eventId: id } }), 3);
    assert.equal(await db.eventRegistrationActivity.count({ where: { registrationId: participant.id } }), 2);
    const copy = await saveEventRecord(db, { ...input, slug: "copy-isolated", status: "DRAFT", registrationOpen: false }, user.id); assert.equal(await db.eventRegistration.count({ where: { eventId: copy } }), 0);
  } finally {
    try { if (db) await db.$disconnect(); }
    finally {
      try { if (pool) await pool.end(); }
      finally {
        try { await setup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
        finally { await setup.end(); }
      }
    }
  }
});
