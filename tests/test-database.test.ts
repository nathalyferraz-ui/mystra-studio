import { test } from "node:test";
import assert from "node:assert/strict";
import { assertIsolatedTestDatabase } from "../lib/test-database";
test("test commands reject production aliases across Supabase pooler/direct connections and both runtime URLs", () => {
  const direct = "postgresql://postgres:synthetic@db.projectref.supabase.co:5432/postgres";
  const pooler = "postgresql://custom.projectref:synthetic@aws-0-test.pooler.supabase.com:6543/postgres";
  assert.throws(() => assertIsolatedTestDatabase({ TEST_DATABASE_ISOLATED: "true", TEST_DATABASE_URL: pooler, DIRECT_URL: direct }), /banco da aplicação/);
  assert.throws(() => assertIsolatedTestDatabase({ TEST_DATABASE_ISOLATED: "true", TEST_DATABASE_URL: direct, DATABASE_URL: pooler }), /banco da aplicação/);
  assert.throws(() => assertIsolatedTestDatabase({ TEST_DATABASE_ISOLATED: "true", TEST_DATABASE_URL: "postgresql://test@127.0.0.1/main", DATABASE_URL: "postgresql://owner@localhost:5432/main" }), /banco da aplicação/);
  assert.throws(() => assertIsolatedTestDatabase({ TEST_DATABASE_URL: direct }), /TEST_DATABASE_ISOLATED/);
  assert.throws(() => assertIsolatedTestDatabase({ TEST_DATABASE_ISOLATED: "true", TEST_DATABASE_URL: `${direct}?schema=public` }), /options\/schema/);
  const isolated = "postgresql://postgres:synthetic@db.otherproject.supabase.co:5432/postgres";
  assert.equal(assertIsolatedTestDatabase({ TEST_DATABASE_ISOLATED: "true", TEST_DATABASE_URL: isolated, DATABASE_URL: pooler, DIRECT_URL: direct }), isolated);
});
