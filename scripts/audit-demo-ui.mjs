// UI component fixture only: no demo database, credentials or authenticated E2E.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { adminBrowser } from "./lib/admin-browser.mjs";
const require = createRequire(import.meta.url), b = await adminBrowser(), results = [];
mkdirSync(".next/cache/demo-ui", { recursive: true });
try {
  await b.call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  for (const width of [1440, 1024, 768, 390, 320]) for (const path of ["/admin/demo-ui", "/admin/explorar/servicos", "/admin/demonstracao"]) {
    await b.viewport(width); await b.navigate(path);
    await b.evaluate(readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"));
    const layout = await b.evaluate("({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,notice:!!document.querySelector('.demo-notice-admin'),main:document.querySelectorAll('main').length,h1:document.querySelectorAll('h1').length,unsafeLinks:[...document.querySelectorAll('.ma-sidebar a')].filter(a=>a.pathname!=='/admin'&&!a.pathname.startsWith('/admin/explorar/')&&a.pathname!=='/admin/demonstracao').length})");
    const violations = await b.evaluate("axe.run({exclude:[['.qa-fixture-notice']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length})))");
    results.push({ width, path, ...layout, violations });
    if (path === "/admin/demo-ui") await b.screenshot(`.next/cache/demo-ui/components-${width}.png`);
  }
  const failed = results.filter(r => r.overflow || !r.notice || r.main !== 1 || r.h1 !== 1 || r.unsafeLinks || r.violations.length).length + b.errors.length + b.writes.length;
  writeFileSync(".next/cache/demo-ui/results.json", JSON.stringify({ scope: "Isolated UI components only; no database or authenticated E2E", results, runtimeErrors: b.errors, blockedWrites: b.writes, failed }, null, 2));
  console.log(JSON.stringify({ layouts: results.length, failed, runtimeErrors: b.errors.length, blockedWrites: b.writes.length }));
  if (failed) process.exitCode = 1;
} finally { await b.close(); }
