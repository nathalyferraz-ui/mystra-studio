import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const base = new URL(process.env.AUDIT_BASE_URL || "http://localhost:3000");
const local = u => ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname) && ["http:", "https:"].includes(u.protocol) && !u.username && !u.password;
if (!local(base)) throw new Error("A auditoria de navegador aceita somente uma aplicação local.");
const output = resolve(".next/cache/audit11"); mkdirSync(output, { recursive: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
let browser, socket, targetId, cdp;
try {
  if (process.env.AUDIT_CDP_URL) { cdp = new URL(process.env.AUDIT_CDP_URL); if (!local(cdp)) throw new Error("Use um CDP local."); }
  else {
    const paths = [process.env.AUDIT_CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
    const executable = paths.find(existsSync); if (!executable) throw new Error("Chrome não encontrado. Configure AUDIT_CHROME_PATH ou AUDIT_CDP_URL local.");
    const profile = mkdtempSync(join(output, "chrome-"));
    browser = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
    let startupError = false; browser.on("error", () => { startupError = true; });
    for (let n = 0; n < 150; n++) { if (startupError) break; const portFile = join(profile, "DevToolsActivePort"); if (existsSync(portFile)) { const port = Number(readFileSync(portFile, "utf8").split("\n")[0]); if (Number.isInteger(port) && port > 0) { cdp = new URL(`http://127.0.0.1:${port}`); break; } } await pause(100); }
    if (!cdp) throw new Error("O navegador local não iniciou o CDP.");
  }
  const target = await (await fetch(new URL("/json/new?about:blank", cdp), { method: "PUT" })).json(); targetId = target.id;
  socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((done, fail) => { socket.addEventListener("open", done, { once: true }); socket.addEventListener("error", fail, { once: true }); });
  const requests = new Map(); let id = 0; const runtimeErrors = [], blockedWrites = [];
  const call = (method, params = {}) => new Promise((done, fail) => { const n = ++id; const timer = setTimeout(() => { requests.delete(n); fail(new Error(`CDP timeout: ${method}`)); }, 30000); requests.set(n, { done: value => { clearTimeout(timer); done(value); }, fail: error => { clearTimeout(timer); fail(error); } }); socket.send(JSON.stringify({ id: n, method, params })); });
  socket.addEventListener("message", event => { const m = JSON.parse(event.data); if (m.id) { const request = requests.get(m.id); requests.delete(m.id); if (request) { if (m.error) request.fail(new Error(m.error.message)); else request.done(m.result); } }
    if (m.method === "Runtime.exceptionThrown") runtimeErrors.push(m.params.exceptionDetails.text);
    if (m.method === "Fetch.requestPaused") { const { request, requestId } = m.params; if (!["GET", "HEAD"].includes(request.method)) { blockedWrites.push({ method: request.method, path: new URL(request.url).pathname }); void call("Fetch.failRequest", { requestId, errorReason: "Aborted" }); } else void call("Fetch.continueRequest", { requestId }); }
  });
  await call("Page.enable"); await call("Runtime.enable"); await call("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const evaluate = async expression => { const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error("Falha na avaliação local de navegador."); return r.result.value; };
  const axe = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
  const routes = ["/", "/sobre", "/servicos", "/portfolio", "/academia", "/blog", "/eventos", "/contato", "/orcamento", "/trabalhe-conosco", "/privacidade", "/admin/login"];
  const results = [];
  for (const width of [1440, 390]) for (const route of routes) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: width < 700 }); await call("Page.navigate", { url: new URL(route, base).href });
    await pause(1100); await evaluate("document.fonts.ready.then(()=>true)"); await evaluate(axe);
    const details = await evaluate(`JSON.stringify({path:location.pathname,width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,h1:document.querySelectorAll('h1').length,mains:document.querySelectorAll('main').length,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,robots:document.querySelector('meta[name=robots]')?.content,scriptBytes:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script').reduce((n,r)=>n+r.encodedBodySize,0),brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash.length>1&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash)})`);
    const findings = await evaluate(`axe.run({exclude:[['nextjs-portal']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>JSON.stringify(r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))))`);
    const result = { ...JSON.parse(details), violations: JSON.parse(findings) }; results.push(result); console.log(JSON.stringify({ path: route, width, overflow: result.overflow, violations: result.violations.map(v => v.id), brokenAnchors: result.brokenAnchors }));
    if (route === "/" && width === 390) {
      await evaluate("document.querySelector('.mobile-toggle').click()"); await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await pause(100);
      result.keyboardMenuClosed = await evaluate("document.querySelector('.mobile-toggle').getAttribute('aria-expanded')==='false'");
    }
    if (route === "/contato" && width === 390) { await evaluate("document.querySelector('.ms-contact-form')?.requestSubmit()"); await pause(100); result.invalidFormErrors = await evaluate("document.querySelectorAll('.ms-contact-form [aria-invalid=true]').length"); }
  }
  for (const width of [320, 768]) for (const route of ["/", "/sobre", "/contato"]) { await call("Emulation.setDeviceMetricsOverride", { width, height: 950, deviceScaleFactor: 1, mobile: true }); await call("Page.navigate", { url: new URL(route, base).href }); await pause(700); results.push(JSON.parse(await evaluate("JSON.stringify({path:location.pathname,width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})"))); }
  // Text enlargement: default font doubled, preserving the actual mobile viewport.
  await call("Page.navigate", { url: new URL("/", base).href }); await pause(700); await evaluate("(()=>{const nodes=[...document.querySelectorAll('h1,h2,h3,p,a,label,button,input,textarea,select,summary,li,small,span')].filter(n=>!n.closest('[aria-hidden=true]'));const sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.fontSize=`${sizes[i]*2}px`);return true})()");
  const zoom = JSON.parse(await evaluate("JSON.stringify({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth})"));
  const report = { generatedAt: new Date().toISOString(), engine: `axe-core ${require("axe-core/package.json").version}`, scope: "Read-only local browser; all non-GET/HEAD requests blocked", results, zoom, runtimeErrors, blockedWrites };
  writeFileSync(join(output, "browser.json"), JSON.stringify(report, null, 2));
  const failed = results.some(r => r.overflow || r.violations?.length || r.brokenImages || r.brokenAnchors?.length || r.keyboardMenuClosed === false) || runtimeErrors.length || zoom.overflow || blockedWrites.length;
  console.log(JSON.stringify({ checks: results.length + 1, failingChecks: results.filter(r => r.overflow || r.violations?.length || r.brokenAnchors?.length || r.keyboardMenuClosed === false).length + Number(zoom.overflow), zoomOverflow: zoom.overflow, runtimeErrors: runtimeErrors.length, blockedWrites: blockedWrites.length, passed: !failed }));
  if (failed) process.exitCode = 1;
} catch (error) { console.error(error instanceof Error ? error.message : "Auditoria de navegador não concluída."); process.exitCode = 1; }
finally { socket?.close(); if (targetId && cdp) { try { await fetch(new URL(`/json/close/${targetId}`, cdp)); } catch {} } if (browser) browser.kill(); }
