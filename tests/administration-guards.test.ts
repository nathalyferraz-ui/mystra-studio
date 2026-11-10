import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "../generated/prisma/client";
import { updateAccount, updateRolePermissions, permissionVersion } from "../features/administration/repository";
const time = new Date("2026-11-06T12:00:00.000Z");
function fixture({ actorAdmin = true, actorActive = true, targetAdmin = true, otherRecoverable = 0, self = false }: { actorAdmin?: boolean; actorActive?: boolean; targetAdmin?: boolean; otherRecoverable?: number; self?: boolean } = {}) {
  let writes = 0, revocations = 0;
  const role = (code: string, permissions: string[] = []) => ({ role: { code, permissions: permissions.map(code => ({ permission: { code } })) } });
  const actor = { id: "actor", active: actorActive, roles: [role(actorAdmin ? "ADMIN" : "EDITOR", ["users:manage"])] };
  const target = { id: self ? "actor" : "target", active: true, updatedAt: time, roles: [role(targetAdmin ? "ADMIN" : "COMERCIAL")] };
  const tx = { $queryRaw: async () => [], user: { findUnique: async () => actor, findUniqueOrThrow: async () => target, count: async () => otherRecoverable, update: async () => { writes++; return target; } }, session: { deleteMany: async () => { revocations++; } }, adminLog: { create: async () => { writes++; } }, role: { findUniqueOrThrow: async () => ({ id: "role", code: targetAdmin ? "ADMIN" : "EDITOR", permissions: [] }) }, rolePermission: { deleteMany: async () => { writes++; } } };
  const db = { $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx) } as unknown as PrismaClient;
  return { db, input: { id: target.id, version: time.toISOString(), operation: "deactivate" as const }, writes: () => writes, revocations: () => revocations };
}
test("account updates block removal of the last recoverable admin, self-deactivation and stale state before writes", async () => {
  const last = fixture(); await assert.rejects(updateAccount(last.db, last.input, "actor"), /LAST_ADMIN/); assert.equal(last.writes(), 0);
  const self = fixture({ self: true, otherRecoverable: 1 }); await assert.rejects(updateAccount(self.db, self.input, "actor"), /SELF_CHANGE/); assert.equal(self.writes(), 0);
  const stale = fixture({ otherRecoverable: 1 }); await assert.rejects(updateAccount(stale.db, { ...stale.input, version: "2020-01-01T00:00:00.000Z" }, "actor"), /CONFLICT/); assert.equal(stale.writes(), 0);
  const safe = fixture({ otherRecoverable: 1 }); await updateAccount(safe.db, safe.input, "actor"); assert.equal(safe.writes(), 2); assert.equal(safe.revocations(), 1);
});
test("user managers cannot elevate roles or alter ADMIN accounts and inactive actors cannot write", async () => {
  const manager = fixture({ actorAdmin: false }); await assert.rejects(updateAccount(manager.db, manager.input, "actor"), /ACCESS/); assert.equal(manager.writes(), 0);
  const elevation = fixture({ actorAdmin: false, targetAdmin: false }); await assert.rejects(updateAccount(elevation.db, { ...elevation.input, operation: "roles", roles: ["ADMIN"] }, "actor"), /ACCESS/); assert.equal(elevation.writes(), 0);
  const inactive = fixture({ actorActive: false }); await assert.rejects(updateAccount(inactive.db, inactive.input, "actor"), /ACCESS/); assert.equal(inactive.writes(), 0);
});
test("role grants refuse non-ADMIN actors, immutable ADMIN and stale permission snapshots", async () => {
  const manager = fixture({ actorAdmin: false, targetAdmin: false }); await assert.rejects(updateRolePermissions(manager.db, { roleId: "role", version: permissionVersion([]), permissions: [] }, "actor"), /ACCESS/);
  const admin = fixture(); await assert.rejects(updateRolePermissions(admin.db, { roleId: "role", version: permissionVersion([]), permissions: [] }, "actor"), /ADMIN_FIXED/);
  const stale = fixture({ targetAdmin: false }); await assert.rejects(updateRolePermissions(stale.db, { roleId: "role", version: permissionVersion(["content:manage"]), permissions: [] }, "actor"), /CONFLICT/); assert.equal(stale.writes(), 0);
});
