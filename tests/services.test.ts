import { test } from "node:test";
import assert from "node:assert/strict";
import { searchOptions } from "../features/cms/filters";
import { contentSchema } from "../features/cms/schema";

test("malformed sort inputs fall back to a valid deterministic service ordering", () => {
  const expected = searchOptions({}, "servicos").orderBy;
  for (const sort of ["__proto__", "constructor", "toString", "invalid-sort"]) {
    const result = searchOptions({ sort, status: "DRAFT", page: "invalid" }, "servicos");
    assert.deepEqual(result.orderBy, expected);
    assert.equal(result.where.status, "PUBLISHED");
    assert.equal(result.page, 1);
  }
  assert.equal(searchOptions({ q: "   " }, "servicos").q, "");
});

test("services validate complementary rich content before publication", () => {
  const service = {
    module: "servicos", title: "Teste de validação", slug: "teste-de-validacao",
    summary: "Conteúdo isolado para validação do formulário.",
    description: "Descrição completa usada somente neste teste isolado.",
    status: "PUBLISHED",
    body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Informações complementares." }] }] },
  };
  assert.equal(contentSchema.safeParse(service).success, true);
  assert.equal(contentSchema.safeParse({ ...service, body: { type: "doc", content: [{ type: "image", attrs: { src: "https://example.test/untrusted.svg" } }] } }).success, false);
  assert.equal(contentSchema.safeParse({ ...service, description: "" }).success, false);
});
