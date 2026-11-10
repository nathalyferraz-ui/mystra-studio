import { Pool } from "pg";
import { demoMarkerKey } from "./environment";
import { assertDemoMarker } from "./demo-marker";
import { assertDemoRole, type DemoRoleFacts } from "./demo-role";
export function demoRuntimeGuard(connectionString: string, projectRef: string) {
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000, statement_timeout: 5000 });
  let validUntil = 0, pending: Promise<void> | undefined;
  async function validate() {
    const result = await pool.query<DemoRoleFacts & { marker: unknown }>(`SELECT current_user AS role,
      (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolinherit) AS elevated,
      EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) AS memberships,
      EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('Session','RateLimit','AdminLog') AND has_table_privilege(current_user, format('%I.%I', schemaname, tablename), 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS "businessWrite",
      EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename IN ('JobApplication','ApplicationNote','ApplicationActivity','LeadAttachment','Verification','_prisma_migrations') AND has_table_privilege(current_user, format('%I.%I', schemaname, tablename), 'SELECT')) AS "privateRead",
      has_table_privilege(current_user, 'public."AdminLog"', 'UPDATE,DELETE,TRUNCATE') AS "auditWrite",
      (SELECT value FROM public."InstitutionalSetting" WHERE key=$1) AS marker
      FROM pg_roles r WHERE r.rolname=current_user`, [demoMarkerKey]);
    const row = result.rows[0];
    assertDemoRole(row);
    assertDemoMarker(row?.marker, projectRef);
    validUntil = Date.now() + 15000;
  }
  return {
    async assert() { if (Date.now() < validUntil) return; pending ??= validate().finally(() => { pending = undefined; }); await pending; },
    close: () => pool.end(),
  };
}
