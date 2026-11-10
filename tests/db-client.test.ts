import { test } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../lib/db";
test("the reusable database client follows configuration changes and refuses missing configuration", async () => {
  const previous = process.env.DATABASE_URL;
  // No query is executed and no connection is opened for these constructor checks.
  let first: ReturnType<typeof getDb> | undefined, second: ReturnType<typeof getDb> | undefined;
  try {
    process.env.DATABASE_URL = "postgresql://synthetic:synthetic@127.0.0.1:1/isolated_a"; first = getDb(); assert.equal(getDb(), first);
    delete process.env.DATABASE_URL; assert.throws(() => getDb(), /DATABASE_URL/);
    process.env.DATABASE_URL = "https://example.test"; assert.throws(() => getDb(), /PostgreSQL/);
    process.env.DATABASE_URL = "postgresql://synthetic:synthetic@127.0.0.1:1/isolated_b"; second = getDb(); assert.notEqual(second, first); assert.equal(getDb(), second);
  } finally { if (first) await first.$disconnect(); if (second) await second.$disconnect(); if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});
