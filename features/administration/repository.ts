import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { permissionCatalog, type PermissionCode } from "./permissions";
import { hasPermission } from "@/lib/permissions";
export function permissionVersion(codes: string[]) { return createHash("sha256").update([...codes].sort().join("\n")).digest("hex"); }
export async function updateAccount(db: PrismaClient, input: { id: string; version: string; operation: "activate" | "deactivate" | "revoke" | "roles"; roles?: ("ADMIN" | "EDITOR" | "COMERCIAL")[] }, actorId: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(548313072)::text AS locked`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    if (!actor || !hasPermission(actor, "users:manage")) throw new Error("ACCESS");
    const actorAdmin = actor.roles.some(r => r.role.code === "ADMIN");
    const target = await tx.user.findUniqueOrThrow({ where: { id: input.id }, include: { roles: { include: { role: true } } } });
    if (target.updatedAt.toISOString() !== input.version) throw new Error("CONFLICT");
    const isAdmin = target.roles.some(r => r.role.code === "ADMIN");
    if (!actorAdmin && (isAdmin || input.operation === "roles" || target.id === actorId)) throw new Error("ACCESS");
    if (target.id === actorId && input.operation !== "revoke") throw new Error("SELF_CHANGE");
    const removingAdmin = isAdmin && (input.operation === "deactivate" || input.operation === "roles" && !input.roles?.includes("ADMIN"));
    if (target.active && removingAdmin) {
      const others = await tx.user.count({ where: { id: { not: target.id }, active: true, roles: { some: { role: { code: "ADMIN" } } }, accounts: { some: { providerId: "credential", password: { not: null } } } } }); if (!others) throw new Error("LAST_ADMIN");
    }
    if (input.operation === "roles") {
      if (!input.roles?.length) throw new Error("ROLES");
      const roles = await Promise.all(input.roles.map(code => tx.role.upsert({ where: { code }, create: { code, name: code }, update: {} })));
      await tx.userRole.deleteMany({ where: { userId: target.id } }); await tx.userRole.createMany({ data: roles.map(r => ({ userId: target.id, roleId: r.id })) });
    }
    await tx.user.update({ where: { id: target.id }, data: { ...(input.operation === "activate" ? { active: true } : input.operation === "deactivate" ? { active: false } : {}), updatedAt: new Date() } });
    await tx.session.deleteMany({ where: { userId: target.id } });
    await tx.adminLog.create({ data: { userId: actorId, action: `user.${input.operation}`, resource: target.id, metadata: { sessionsRevoked: true, ...(input.operation === "roles" ? { roles: input.roles } : {}) } } });
  });
}
export async function updateRolePermissions(db: PrismaClient, input: { roleId: string; version: string; permissions: PermissionCode[] }, actorId: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(548313072)::text AS locked`;
    const actor = await tx.user.findUnique({ where: { id: actorId }, include: { roles: { include: { role: true } } } });
    if (!actor?.active || !actor.roles.some(r => r.role.code === "ADMIN")) throw new Error("ACCESS");
    const role = await tx.role.findUniqueOrThrow({ where: { id: input.roleId }, include: { permissions: { include: { permission: true } } } }); if (role.code === "ADMIN") throw new Error("ADMIN_FIXED");
    if (permissionVersion(role.permissions.map(p => p.permission.code)) !== input.version) throw new Error("CONFLICT");
    // Preserve unknown legacy permission codes; this interface edits only its explicit catalog.
    await tx.rolePermission.deleteMany({ where: { roleId: role.id, permission: { code: { in: Object.keys(permissionCatalog) } } } });
    for (const code of [...new Set(input.permissions)]) { const p = await tx.permission.upsert({ where: { code }, create: { code, name: permissionCatalog[code] }, update: {} }); await tx.rolePermission.create({ data: { roleId: role.id, permissionId: p.id } }); }
    await tx.session.deleteMany({ where: { user: { roles: { some: { roleId: role.id } } } } });
    await tx.adminLog.create({ data: { userId: actorId, action: "role.permissions", resource: role.id, metadata: { role: role.code, codes: input.permissions, sessionsRevoked: true } } });
  });
}
