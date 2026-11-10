import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { assertDemoMarker, demoMarkerKey } from "@/lib/demo-marker";
import { demoAuthorId, demoFixturePlan, fixtureRegistryKey, jsonValue } from "./fixtures";
type Tx = Prisma.TransactionClient;
async function lock(tx: Tx) { await tx.$queryRaw`SELECT pg_advisory_xact_lock(128197, 12)`; }
export async function requireDemoMarker(tx: Tx, projectRef: string) { assertDemoMarker((await tx.institutionalSetting.findUnique({ where: { key: demoMarkerKey } }))?.value, projectRef); }

/** Only marks a freshly migrated, empty, isolated project. Never marks a copied database. */
export async function prepareDemoDatabase(db: PrismaClient, projectRef: string) {
  return db.$transaction(async tx => {
    await lock(tx);
    const existing = await tx.institutionalSetting.findUnique({ where: { key: demoMarkerKey } });
    if (existing) { assertDemoMarker(existing.value, projectRef); return { prepared: false }; }
    const occupied = await Promise.all([tx.user.count(), tx.role.count(), tx.content.count(), tx.media.count(), tx.event.count(), tx.speaker.count(), tx.eventCategory.count(), tx.lead.count(), tx.job.count(), tx.category.count(), tx.tag.count(), tx.technology.count(), tx.institutionalSetting.count(), tx.adminLog.count(), tx.rateLimit.count()]);
    if (occupied.some(Boolean)) throw new Error("DEMO_DATABASE_MUST_BE_EMPTY");
    // The existing careers migration may have created this permission; nothing else is imported.
    if (await tx.permission.count({ where: { code: { not: "recruitment:manage" } } })) throw new Error("DEMO_DATABASE_MUST_BE_EMPTY");
    await tx.institutionalSetting.create({ data: { key: demoMarkerKey, value: { environment: "demo", projectRef, version: 1, syntheticOnly: true, instanceId: randomUUID(), preparedAt: new Date().toISOString() } } });
    return { prepared: true };
  }, { timeout: 30000 });
}

export async function seedDemoDatabase(db: PrismaClient, projectRef: string, restore = false, now = new Date()) {
  return db.$transaction(async tx => {
    await lock(tx); await requireDemoMarker(tx, projectRef);
    const registry = await tx.institutionalSetting.findUnique({ where: { key: fixtureRegistryKey } });
    const previous = registry?.value as { version?: number; reference?: string; ids?: unknown } | undefined;
    if (previous && (previous.version !== 1 || !previous.reference)) throw new Error("UNKNOWN_DEMO_REGISTRY");
    const plan = demoFixturePlan(previous?.reference || now.toISOString().slice(0, 10));
    if (previous && !isDeepStrictEqual(previous.ids, plan.ids)) throw new Error("DEMO_REGISTRY_CHANGED_REVIEW_REQUIRED");
    const managed = await Promise.all([tx.user.count({ where: { id: { in: plan.ids.authors } } }), tx.category.count({ where: { id: { in: plan.ids.categories } } }), tx.technology.count({ where: { id: { in: plan.ids.technologies } } }), tx.tag.count({ where: { id: { in: plan.ids.tags } } }), tx.content.count({ where: { id: { in: plan.ids.content } } }), tx.eventCategory.count({ where: { id: { in: plan.ids.eventCategories } } }), tx.event.count({ where: { id: { in: plan.ids.events } } }), tx.eventScheduleItem.count({ where: { id: { in: plan.ids.schedule } } }), tx.lead.count({ where: { id: { in: plan.ids.leads } } }), tx.job.count({ where: { id: { in: plan.ids.jobs } } })]);
    if (!registry && managed.some(Boolean)) throw new Error("UNMANAGED_DEMO_ID_COLLISION");
    if (restore && !registry) throw new Error("SEED_REQUIRED_BEFORE_RESTORE");
    const author = { name: "Redação demonstrativa", email: "redacao-demo@example.com", active: false, emailVerified: false };
    await tx.user.upsert({ where: { id: demoAuthorId }, create: { id: demoAuthorId, ...author }, update: restore ? author : {} });
    for (const item of plan.categories) await tx.category.upsert({ where: { id: item.id }, create: item, update: restore ? item : {} });
    for (const item of plan.technologies) await tx.technology.upsert({ where: { id: item.id }, create: item, update: restore ? item : {} });
    for (const item of plan.tags) await tx.tag.upsert({ where: { id: item.id }, create: item, update: restore ? item : {} });
    const kinds = { servicos: "SERVICE", portfolio: "PROJECT", blog: "ARTICLE" } as const;
    for (const item of plan.content) {
      const data = { kind: kinds[item.module], title: item.title, slug: item.slug, summary: item.summary, description: item.description, body: jsonValue(item.body), challenge: item.challenge, solution: item.solution, results: item.results, benefits: item.benefits, externalUrl: item.externalUrl || null, icon: item.icon || null, status: item.status, featured: item.featured, sortOrder: item.sortOrder, seoTitle: item.seoTitle, seoDescription: item.seoDescription, publishedAt: item.status === "PUBLISHED" ? plan.publishedAt : null, authorId: demoAuthorId, categoryId: item.categoryId || null };
      await tx.content.upsert({ where: { id: item.id! }, create: { id: item.id!, ...data, technologies: { connect: item.technologyIds.map(id => ({ id })) }, tags: { connect: item.tagIds.map(id => ({ id })) } }, update: restore ? { ...data, version: { increment: 1 }, technologies: { set: item.technologyIds.map(id => ({ id })) }, tags: { set: item.tagIds.map(id => ({ id })) } } : {} });
    }
    const eventCategory = { id: "demo-event-category", name: "Encontros demonstrativos", slug: "demo-encontros", description: "Programação fictícia, sem inscrições ou encontros reais." };
    await tx.eventCategory.upsert({ where: { id: eventCategory.id }, create: eventCategory, update: restore ? eventCategory : {} });
    for (const [index, item] of plan.events.entries()) {
      const data = { title: item.title, slug: item.slug, summary: item.summary, description: item.description, objectives: item.objectives, audience: item.audience, topics: item.topics, additionalInfo: item.additionalInfo, privateAccess: "", startsAt: new Date(item.startsAt), endsAt: new Date(item.endsAt), timezone: item.timezone, mode: item.mode, location: "", capacity: null, registrationOpen: false, registrationStartsAt: null, registrationEndsAt: null, status: item.status, featured: item.featured, seoTitle: item.seoTitle, seoDescription: item.seoDescription, publishedAt: plan.publishedAt, categoryId: eventCategory.id };
      await tx.event.upsert({ where: { id: item.id! }, create: { id: item.id!, ...data }, update: restore ? { ...data, version: { increment: 1 } } : {} });
      const schedule = { eventId: item.id!, startsAt: new Date(item.schedule[0].startsAt), title: item.schedule[0].title, description: item.schedule[0].description, speakerId: null };
      await tx.eventScheduleItem.upsert({ where: { id: plan.ids.schedule[index] }, create: { id: plan.ids.schedule[index], ...schedule }, update: restore ? schedule : {} });
    }
    for (const item of plan.leads) await tx.lead.upsert({ where: { id: item.id }, create: { ...item, completedAt: item.status === "CONCLUIDO" ? now : null }, update: restore ? { ...item, version: { increment: 1 }, assigneeId: null, completedAt: item.status === "CONCLUIDO" ? now : null } : {} });
    for (const item of plan.jobs) {
      const data = { title: item.title, slug: item.slug, summary: item.summary, area: item.area, mode: item.mode, level: item.level, contractType: item.contractType, location: item.location, description: item.description, responsibilities: item.responsibilities, requirements: item.requirements, desirable: item.desirable, benefits: item.benefits, status: item.status, keepClosedPublic: item.keepClosedPublic, seoTitle: item.seoTitle, seoDescription: item.seoDescription, publishedAt: new Date(item.publishedAt), deadline: new Date(item.deadline), closedAt: null };
      await tx.job.upsert({ where: { id: item.id! }, create: { id: item.id!, ...data }, update: restore ? { ...data, version: { increment: 1 } } : {} });
    }
    const ids = Object.values(plan.ids).flat(), created = ids.length - managed.reduce((sum, value) => sum + value, 0);
    await tx.institutionalSetting.upsert({ where: { key: fixtureRegistryKey }, create: { key: fixtureRegistryKey, value: jsonValue({ version: 1, reference: plan.reference, ids: plan.ids }) }, update: {} });
    if (created || restore) await tx.adminLog.create({ data: { action: restore ? "demo.restore" : "demo.seed", resource: "synthetic-fixtures", metadata: { created, restored: restore ? ids.length - created : 0 } } });
    return { created, unchanged: restore ? 0 : ids.length - created, restored: restore ? ids.length - created : 0, reference: plan.reference };
  }, { timeout: 60000 });
}
