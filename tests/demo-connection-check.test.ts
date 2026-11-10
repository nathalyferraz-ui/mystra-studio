import test from "node:test";
import assert from "node:assert/strict";
import { inspectDemoConnections } from "../lib/demo-connection-check";
import { supabaseIdentity, validRootCertificatePath } from "../lib/environment";
const primaryRef = "a".repeat(20), demoRef = "b".repeat(20);
const url = (ref: string, role = "postgres", port = 5432) => `postgresql://${role}.${ref}:synthetic@aws-0-test.pooler.supabase.com:${port}/postgres?sslmode=verify-full`;
const primary = { DATABASE_URL: url(primaryRef), DIRECT_URL: url(primaryRef) };
const demo = { PRIMARY_SUPABASE_PROJECT_REF: primaryRef, DEMO_SUPABASE_PROJECT_REF: demoRef, DEMO_DATABASE_URL: url(demoRef), DEMO_DIRECT_URL: url(demoRef), DEMO_ISOLATED_CONFIRMED: "false" };
test("identity preflight accepts a fresh demo connection pair without authorizing writes or runtime", () => {
  assert.deepEqual(inspectDemoConnections(primary, demo), { projectRef: demoRef, primaryDifferent: true, sameProject: true, restrictedRuntimeRole: false });
  assert.equal(demo.DEMO_ISOLATED_CONFIRMED, "false");
  assert.ok(inspectDemoConnections(primary, { ...demo, DEMO_DATABASE_URL: url(demoRef, "mystra_demo_app", 6543) }).restrictedRuntimeRole);
});
test("preflight rejects primary aliases, mismatched pairs, missing values and unsafe owner connections", () => {
  for (const change of [{ DEMO_DATABASE_URL: primary.DATABASE_URL }, { DEMO_DIRECT_URL: primary.DIRECT_URL }, { DEMO_SUPABASE_PROJECT_REF: primaryRef }, { DEMO_DIRECT_URL: url(demoRef, "postgres", 6543) }, { DEMO_DATABASE_URL: "" }, { DATABASE_URL: url(demoRef) }, { PRIMARY_SUPABASE_PROJECT_REF: demoRef }]) assert.throws(() => inspectDemoConnections(primary, { ...demo, ...change }));
  const direct = `postgresql://postgres:synthetic@db.${primaryRef}.supabase.co/postgres?sslmode=verify-full`;
  assert.throws(() => inspectDemoConnections(primary, { ...demo, DEMO_DIRECT_URL: direct }));
});
test("verified TLS can reference only the reviewed public CA path without changing database identity", () => {
  for (const path of ["prisma/certificates/supabase-root-2021.crt", "C:/workspace/prisma/certificates/supabase-root-2021.crt", "/workspace/prisma/certificates/supabase-root-2021.crt"]) {
    assert.ok(validRootCertificatePath(path));
    assert.equal(supabaseIdentity(url(demoRef) + "&sslrootcert=" + encodeURIComponent(path)).projectRef, demoRef);
  }
  for (const path of [".env", "../secret.pem", "https://example.com/cert.crt", "C:/workspace/../prisma/certificates/supabase-root-2021.crt", "prisma/certificates/private.key"]) assert.throws(() => supabaseIdentity(url(demoRef) + "&sslrootcert=" + encodeURIComponent(path)));
  assert.throws(() => supabaseIdentity(url(demoRef) + "&sslrootcert=prisma/certificates/supabase-root-2021.crt&sslrootcert=prisma/certificates/supabase-root-2021.crt"));
});
