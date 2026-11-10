import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { adminBrowser } from "./lib/admin-browser.mjs";
const require = createRequire(import.meta.url), b = await adminBrowser({ baseURL: "http://127.0.0.1:3000" }), results = [];
mkdirSync(".next/cache/v1", { recursive: true });
try {
  await b.call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  for (const width of [1440, 1024, 768, 390, 320]) for (const path of ["/", "/sobre", "/servicos", "/portfolio", "/blog", "/contato"]) {
    await b.viewport(width); await b.navigate(path);
    await b.evaluate("new Promise((resolve,reject)=>{const start=Date.now();const check=()=>{if(document.title&&document.querySelector('main h1'))resolve(true);else if(Date.now()-start>20000)reject(new Error('Public page did not finish rendering'));else setTimeout(check,150)};check()})");
    await b.evaluate("document.fonts.ready.then(()=>true)");
    await b.evaluate(readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"));
    const layout = await b.evaluate("({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,h1:document.querySelectorAll('h1').length,main:document.querySelectorAll('main').length,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length,deferredLinks:[...document.querySelectorAll('.site-header a,.site-footer a,.explore-grid a')].filter(a=>/^\\/(academia|eventos|trabalhe-conosco|downloads|demonstracao)(\\/|$)/.test(a.pathname)).length,brokenAnchors:[...document.querySelectorAll('a[href^=\"#\"]')].filter(a=>a.hash.length>1&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).length})");
    const violations = await b.evaluate("axe.run({exclude:[['nextjs-portal']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length})))");
    results.push({ width, path, ...layout, violations });
    if (path === "/" && [1440, 390].includes(width)) await b.screenshot(`.next/cache/v1/home-${width}.png`);
  }
  const failed = results.filter(r => r.overflow || r.h1 !== 1 || r.main !== 1 || r.brokenImages || r.deferredLinks || r.brokenAnchors || r.violations.length).length + b.errors.length + b.writes.length;
  writeFileSync(".next/cache/v1/browser.json", JSON.stringify({ scope: "Real local public application, empty database, no authenticated CRUD; all browser writes blocked", results, runtimeErrors: b.errors, blockedWrites: b.writes, failed }, null, 2));
  console.log(JSON.stringify({ layouts: results.length, failed, runtimeErrors: b.errors.length, blockedWrites: b.writes.length }));
  if (failed) process.exitCode = 1;
} finally { await b.close(); }
