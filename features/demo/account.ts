import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { reservedDemoEmail } from "@/lib/demo-policy";
import { demoViewerId } from "./fixtures";
import { requireDemoMarker } from "./seed";
const credentials = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()).refine(reservedDemoEmail), password: z.string().min(12).max(128), confirmation: z.string() }).refine(v => v.password === v.confirmation);
export async function createDemoAccount(db: PrismaClient, projectRef: string, input: unknown) {
  const value = credentials.parse(input);
  const password = await hashPassword(value.password);
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(128197, 12)`;
    await requireDemoMarker(tx, projectRef);
    if (await tx.user.findFirst({ where: { OR: [{ id: demoViewerId }, { email: value.email }] } })) throw new Error("DEMO_ACCOUNT_EXISTS");
    const existingRole = await tx.role.findUnique({ where: { code: "EDITOR" }, include: { permissions: { include: { permission: true } } } });
    if (existingRole?.permissions.some(p => p.permission.code !== "demo:explore")) throw new Error("DEMO_ROLE_HAS_UNSAFE_PERMISSIONS");
    const permission = await tx.permission.upsert({ where: { code: "demo:explore" }, create: { code: "demo:explore", name: "Explorar demonstração somente leitura" }, update: {} });
    const role = await tx.role.upsert({ where: { code: "EDITOR" }, create: { code: "EDITOR", name: "Visitante de demonstração" }, update: {} });
    await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, create: { roleId: role.id, permissionId: permission.id }, update: {} });
    await tx.user.create({ data: { id: demoViewerId, name: "Visitante Demo", email: value.email, active: true, emailVerified: true, accounts: { create: { providerId: "credential", accountId: demoViewerId, password } }, roles: { create: { roleId: role.id } } } });
    await tx.adminLog.create({ data: { action: "demo.account.created", resource: "demo-account" } });
  });
}
