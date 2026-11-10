import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";

export const bootstrapAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().pipe(z.email().max(254)).transform(value => value.toLowerCase()),
  password: z.string().min(12).max(128),
  confirmation: z.string(),
}).refine(value => value.password === value.confirmation, { path: ["confirmation"], message: "As senhas não coincidem." });

export async function initializeFirstAdmin(db: PrismaClient, raw: unknown) {
  const input = bootstrapAdminSchema.parse(raw);
  if (await db.user.count()) throw new Error("USERS_EXIST");
  const hash = await hashPassword(input.password);
  await db.$transaction(async tx => {
    // The unique marker serializes competing attempts; a failed transaction rolls it back.
    await tx.institutionalSetting.create({ data: { key: "system.bootstrap.completed", value: true } });
    if (await tx.user.count()) throw new Error("USERS_EXIST");
    const permissions = [
      { code: "content:manage", name: "Gerenciar conteúdo" },
      { code: "requests:manage", name: "Gerenciar solicitações comerciais" },
      { code: "users:manage", name: "Gerenciar usuários" },
      { code: "settings:manage", name: "Gerenciar configurações" },
    ];
    for (const permission of permissions) await tx.permission.upsert({ where: { code: permission.code }, create: permission, update: {} });
    for (const code of ["ADMIN", "EDITOR", "COMERCIAL"] as const) {
      const role = await tx.role.upsert({ where: { code }, create: { code, name: code === "ADMIN" ? "Administrador" : code === "EDITOR" ? "Editor" : "Comercial" }, update: {} });
      const allowed = permissions.filter(p => code === "ADMIN" || (code === "EDITOR" ? p.code === "content:manage" : p.code === "requests:manage"));
      for (const p of allowed) {
        const permission = await tx.permission.findUniqueOrThrow({ where: { code: p.code } });
        await tx.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, create: { roleId: role.id, permissionId: permission.id }, update: {} });
      }
    }
    const role = await tx.role.findUniqueOrThrow({ where: { code: "ADMIN" } });
    const id = randomUUID();
    const user = await tx.user.create({ data: { id, name: input.name, email: input.email, accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: hash } }, roles: { create: { roleId: role.id } } } });
    await tx.adminLog.create({ data: { userId: user.id, action: "system.bootstrap", resource: "user" } });
  }, { timeout: 15000 });
}
