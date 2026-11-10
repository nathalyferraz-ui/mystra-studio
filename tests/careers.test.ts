import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DemoApplication } from "../features/careers/application-form";
import { careersConfig, syntheticApplication } from "../features/careers/config";
import { jobSchema, applicationSchema } from "../features/careers/schema";
import { canReadApplications, jobAcceptsApplications } from "../features/careers/rules";
import { jobFilters, jobPublicSelect } from "../features/careers/queries";
import { validateResume } from "../features/careers/pdf";
test("careers defaults to demo and live intake requires explicit reviews and operational configuration", () => {
  assert.equal(careersConfig({}).mode, "demo"); assert.equal(careersConfig({ CAREERS_MODE: "unknown" }).configured, false);
  assert.equal(careersConfig({ CAREERS_MODE: "live", CAREERS_RETENTION_DAYS: "30" }).configured, false);
  assert.equal(careersConfig({ CAREERS_MODE: "test", NODE_ENV: "production", CAREERS_CONTROLLED_TEST: "true", CAREERS_RETENTION_DAYS: "30" }).mode, "demo");
  assert.equal(careersConfig({ CAREERS_MODE: "test", NODE_ENV: "development", CAREERS_CONTROLLED_TEST: "true", CAREERS_RETENTION_DAYS: "30" }).configured, true);
  assert.equal(careersConfig({ CAREERS_MODE: "live", CAREERS_RETENTION_DAYS: "30", CAREERS_PRIVACY_REVIEWED: "true", CAREERS_SECURITY_REVIEWED: "true", CAREERS_CONTROLLER_NAME: "Operação isolada de teste", CAREERS_PRIVACY_CONTACT_EMAIL: "privacy@example.test" }).configured, true);
  assert.equal(careersConfig({ CAREERS_MAX_CV_MB: "999" }).maxCVBytes, 5 * 1048576);
});
test("demonstration interface has only synthetic readonly fields and no upload or submission", () => {
  const html = renderToStaticMarkup(createElement(DemoApplication));
  assert.equal(html.includes("<form"), false); assert.equal(html.includes('type="file"'), false); assert.equal(html.includes('type="submit"'), false);
  assert.ok(html.includes("candidato@example.test")); assert.ok(html.includes("readOnly")); assert.ok(html.includes("sintéticos"));
});
test("editor and commercial roles have no implicit access to applicants", () => {
  const user = (role: string, permission: string, active = true) => ({ active, roles: [{ role: { code: role, permissions: [{ permission: { code: permission } }] } }] });
  assert.equal(canReadApplications(user("EDITOR", "content:manage")), false); assert.equal(canReadApplications(user("COMERCIAL", "requests:manage")), false); assert.equal(canReadApplications(user("ADMIN", "")), true); assert.equal(canReadApplications(user("EDITOR", "recruitment:manage")), true); assert.equal(canReadApplications(user("ADMIN", "", false)), false);
});
test("job publication and dates control eligibility independently of demonstration mode", () => {
  const now = new Date("2027-02-01T00:00:00Z"), job = { status: "PUBLISHED", publishedAt: new Date("2027-01-01T00:00:00Z"), deadline: null };
  assert.equal(jobAcceptsApplications(job, now), true);
  for (const patch of [{ status: "DRAFT" }, { status: "CLOSED" }, { status: "ARCHIVED" }, { publishedAt: null }, { publishedAt: new Date("2027-03-01T00:00:00Z") }, { deadline: now }]) assert.equal(jobAcceptsApplications({ ...job, ...patch }, now), false);
  const filters = jobFilters({ status: "DRAFT", state: "all", sort: "constructor" }); assert.ok(filters.where.AND); assert.equal(filters.where.status, undefined); assert.equal("applications" in jobPublicSelect, false); assert.equal("resumePath" in jobPublicSelect, false);
});
test("application validation normalizes email and rejects unsafe links and false privacy acknowledgement", () => {
  const data = { jobId: "isolated-job", name: "Teste Pessoa", email: "CANDIDATO@example.test", phone: "", cityState: "", linkedin: "", portfolio: "", message: "Mensagem sintética somente para validação em memória.", privacy: true, website: "", token: "" };
  assert.equal(applicationSchema.parse(data).email, "candidato@example.test");
  for (const patch of [{ linkedin: "javascript:alert(1)" }, { portfolio: "https://user:secret@example.test" }, { privacy: false }, { website: "spam" }, { phone: "-----" }]) assert.equal(applicationSchema.safeParse({ ...data, ...patch }).success, false);
  assert.equal(syntheticApplication({ name: "Nome real", email: "candidate@example.test" }), false); assert.equal(syntheticApplication({ name: "Teste Exemplo", email: "candidate@example.test" }), true);
  assert.equal(jobSchema.safeParse({}).success, false);
});
test("resume validator parses real static PDF bytes and rejects scripts, MIME spoofing and oversized files", async () => {
  const doc = await PDFDocument.create(); doc.setSubject("mystra-careers-synthetic"); doc.addPage(); const bytes = Buffer.from(await doc.save());
  const result = await validateResume(bytes, "synthetic.pdf", "application/pdf", 5 * 1048576); assert.equal(result.pages, 1); assert.equal(result.synthetic, true);
  await assert.rejects(validateResume(bytes, "file.svg", "application/pdf", 5 * 1048576)); await assert.rejects(validateResume(bytes, "file.pdf", "image/png", 5 * 1048576)); await assert.rejects(validateResume(bytes, "file.pdf", "application/pdf", 10));
  const active = await PDFDocument.create(); active.addPage(); active.addJavaScript("test", "app.alert('blocked')"); await assert.rejects(validateResume(Buffer.from(await active.save()), "active.pdf", "application/pdf", 5 * 1048576));
  await assert.rejects(validateResume(Buffer.from("%PDF-1.7\nnot a PDF\n%%EOF"), "broken.pdf", "application/pdf", 5 * 1048576));
});
test("PDF validation bounds concurrent workers and releases capacity after completion", async () => {
  const doc = await PDFDocument.create(); doc.addPage(); const bytes = Buffer.from(await doc.save());
  const result = await Promise.allSettled(Array.from({ length: 3 }, () => validateResume(bytes, "synthetic.pdf", "application/pdf", 1048576)));
  assert.equal(result.filter(r => r.status === "fulfilled").length, 2);
  assert.equal(result.filter(r => r.status === "rejected" && r.reason.message === "PDF_VALIDATOR_BUSY").length, 1);
  assert.equal((await validateResume(bytes, "synthetic.pdf", "application/pdf", 1048576)).pages, 1);
});
