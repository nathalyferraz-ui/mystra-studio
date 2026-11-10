import { writeFileSync } from "node:fs";
import { headlessChrome } from "./headless-chrome.mjs";

// A fresh test profile never imports credentials, cookies or an authenticated session.
export async function adminBrowser({ baseURL = "http://127.0.0.1:3112" } = {}) {
  const base = new URL(baseURL);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) || !["http:", "https:"].includes(base.protocol)) throw new Error("Local targets only.");
  const browser = await headlessChrome(), { port } = browser;
  try {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${base.origin}/admin`)}`, { method: "PUT" })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done, fail) => { socket.addEventListener("open", done, { once: true }); socket.addEventListener("error", fail, { once: true }); });
  let id = 0; const requests = new Map(), errors = [], writes = [];
  const call = (method, params = {}) => new Promise((done, fail) => {
    const n = ++id, timer = setTimeout(() => { requests.delete(n); fail(new Error(`Timeout: ${method}`)); }, 30000);
    requests.set(n, { done: r => { clearTimeout(timer); done(r); }, fail: e => { clearTimeout(timer); fail(e); } });
    socket.send(JSON.stringify({ id: n, method, params }));
  });
  socket.addEventListener("message", event => {
    const m = JSON.parse(event.data);
    if (m.id) { const r = requests.get(m.id); requests.delete(m.id); if (r) { if (m.error) r.fail(new Error(m.error.message)); else r.done(m.result); } }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.text);
    if (m.method === "Fetch.requestPaused") {
      const { request, requestId } = m.params;
      if (!["GET", "HEAD"].includes(request.method)) { writes.push({ method: request.method, path: new URL(request.url).pathname }); void call("Fetch.failRequest", { requestId, errorReason: "Aborted" }); }
      else void call("Fetch.continueRequest", { requestId });
    }
  });
  await call("Page.enable"); await call("Runtime.enable");
  await call("Page.bringToFront"); await call("Emulation.setFocusEmulationEnabled", { enabled: true });
  await call("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });
  const evaluate = async expression => {
    const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error("Browser evaluation failed; page contents suppressed.");
    return r.result.value;
  };
  const pause = ms => new Promise(r => setTimeout(r, ms));
  const viewport = (width, height = 1000) => call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  const navigate = async path => { await call("Page.navigate", { url: `${base.origin}${path}` }); await pause(1000); await evaluate("document.fonts.ready.then(()=>true)"); };
  const screenshot = async path => {
    // Redact account identifiers in local screenshots, preserving real database content.
    await evaluate("(()=>{const s=document.createElement('style');s.id='qa-redaction';s.textContent='[data-private],.user-menu summary span:not(.avatar),.user-popover p{filter:blur(7px)!important}';document.head.append(s);return true})()");
    const result = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path, Buffer.from(result.data, "base64"));
    await evaluate("document.getElementById('qa-redaction')?.remove()");
  };
  const close = async () => { try { await call("Fetch.disable"); socket.close(); } finally { browser.stop(); } };
  return { call, evaluate, pause, viewport, navigate, screenshot, errors, writes, close };
  } catch (error) { browser.stop(); throw error; }
}
