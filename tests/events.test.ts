import { test } from "node:test";
import assert from "node:assert/strict";
import { zonedInstant, localInput, dayKey, eventDaysInMonth } from "../features/events/time";
import { registrationAvailability, csvCell } from "../features/events/rules";
import { eventSchema, eventRegistrationSchema } from "../features/events/schema";
import { eventFilters, eventPublicSelect } from "../features/events/queries";
const input = { title: "Evento isolado de validação", slug: "evento-isolado", summary: "Resumo usado apenas em testes de validação.", description: "Descrição de teste, sem publicação nem persistência de conteúdo demonstrativo.", objectives: "", audience: "", topics: [], additionalInfo: "", privateAccess: "", startsAt: "2027-05-10T10:00", endsAt: "2027-05-10T12:00", timezone: "America/Sao_Paulo", mode: "ONLINE", location: "", capacity: 10, registrationOpen: true, registrationStartsAt: "", registrationEndsAt: "", status: "PUBLISHED", featured: false, categoryId: "", coverId: "", speakerIds: [], gallery: [], schedule: [], seoTitle: "", seoDescription: "" };
test("event times preserve IANA timezone and reject nonexistent, ambiguous or invalid dates", () => {
  assert.equal(zonedInstant("2027-05-10T10:00", "America/Sao_Paulo").toISOString(), "2027-05-10T13:00:00.000Z");
  assert.equal(localInput(new Date("2027-05-10T13:00:00Z"), "America/Sao_Paulo"), "2027-05-10T10:00");
  assert.equal(dayKey(new Date("2027-05-11T01:00:00Z"), "America/Sao_Paulo"), "2027-05-10");
  assert.throws(() => zonedInstant("2026-03-08T02:30", "America/New_York"));
  assert.throws(() => zonedInstant("2026-11-01T01:30", "America/New_York"));
  assert.throws(() => zonedInstant("2026-02-30T10:00:00Z", "UTC"));
  assert.throws(() => zonedInstant("2026-11-05T24:00:00Z", "UTC"));
  assert.equal(zonedInstant("2026-11-01T01:30:00-04:00", "America/New_York").toISOString(), "2026-11-01T05:30:00.000Z");
});
test("event server validation constrains capacity, schedule, private links and registration windows", () => {
  assert.equal(eventSchema.safeParse(input).success, true);
  assert.equal(eventSchema.safeParse({ ...input, startsAt: "2027-05-10T13:00:00.000Z", endsAt: "2027-05-10T15:00:00.000Z" }).success, true);
  for (const patch of [{ capacity: 0 }, { endsAt: "2027-05-10T09:00" }, { registrationEndsAt: "2027-05-11T10:00" }, { mode: "PRESENCIAL", location: "" }, { location: "https://meeting.example.test/private" }, { schedule: [{ title: "Activity", description: "", startsAt: "2027-05-10T13:00", speakerId: "" }] }, { schedule: [{ title: "Activity", description: "", startsAt: "2027-05-10T11:00", speakerId: "unassociated" }] }]) assert.equal(eventSchema.safeParse({ ...input, ...patch }).success, false);
});
test("calendar covers multiple local days across month boundaries without inventing a midnight end date", () => {
  assert.deepEqual(eventDaysInMonth(new Date("2027-04-30T22:00:00Z"), new Date("2027-05-03T03:00:00Z"), "America/Sao_Paulo", "2027-05"), ["2027-05-01", "2027-05-02"]);
  assert.deepEqual(eventDaysInMonth(new Date("2027-05-10T13:00:00Z"), new Date("2027-05-10T15:00:00Z"), "America/Sao_Paulo", "2027-05"), ["2027-05-10"]);
});
test("registration availability handles capacity, cancellation, draft, dates and opening period", () => {
  const now = new Date("2027-05-01T00:00:00Z"), event = { status: "PUBLISHED", startsAt: new Date("2027-05-10T00:00:00Z"), publishedAt: new Date("2027-01-01T00:00:00Z"), registrationOpen: true, registrationStartsAt: null, registrationEndsAt: null, capacity: 2 };
  assert.equal(registrationAvailability(event, 1, now).open, true);
  assert.equal(registrationAvailability(event, 2, now).code, "FULL");
  assert.equal(registrationAvailability({ ...event, status: "CANCELED" }, 0, now).code, "CANCELED");
  for (const patch of [{ status: "DRAFT" }, { status: "ARCHIVED" }, { publishedAt: null }, { startsAt: now }, { registrationOpen: false }, { registrationEndsAt: now }]) assert.equal(registrationAvailability({ ...event, ...patch }, 0, now).open, false);
  assert.equal(registrationAvailability({ ...event, registrationStartsAt: new Date("2027-05-02T00:00:00Z") }, 0, now).code, "NOT_YET");
});
test("public event filtering never accepts draft state and public projection omits private access and participants", () => {
  const filters = eventFilters({ status: "DRAFT", mode: "__proto__", sort: "constructor", page: "-2" });
  assert.deepEqual(filters.where.status, { in: ["PUBLISHED", "CANCELED"] }); assert.ok(filters.where.publishedAt); assert.equal(filters.page, 1); assert.equal(filters.where.mode, undefined);
  assert.equal("privateAccess" in eventPublicSelect, false); assert.equal("registrations" in eventPublicSelect, false);
  assert.equal(eventFilters({ status: "DRAFT" }, true).where.status, "DRAFT");
});
test("registration validation normalizes email and CSV neutralizes spreadsheet formulas", () => {
  const data = { eventId: "event-test", name: "Pessoa isolada", email: "TEST@example.test", phone: "", privacy: true, website: "", token: "" };
  assert.equal(eventRegistrationSchema.parse(data).email, "test@example.test");
  assert.equal(eventRegistrationSchema.safeParse({ ...data, privacy: false }).success, false);
  assert.equal(eventRegistrationSchema.safeParse({ ...data, website: "spam" }).success, false);
  for (const value of ["=CMD()", "+SUM(A1)", "  @formula", "\t-danger"]) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
});
