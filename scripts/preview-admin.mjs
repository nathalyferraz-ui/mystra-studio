import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:http";
const require = createRequire(import.meta.url);
const { build } = require(createRequire(require.resolve("tsx/package.json")).resolve("esbuild"));
const output = resolve(".next/cache/admin-redesign/fixture"); mkdirSync(output, { recursive: true });
await build({ entryPoints: ["scripts/fixtures/admin-preview.tsx"], outfile: `${output}/preview.js`, bundle: true, platform: "browser", format: "esm", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "isolated-next-ui", setup(build) {
  build.onResolve({ filter: /^next\/(link|navigation)$/ }, args => ({ path: args.path, namespace: "fixture" }));
  build.onResolve({ filter: /^@\/features\/auth\/logout-button$/ }, () => ({ path: "logout", namespace: "fixture" }));
  build.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ loader: "tsx", resolveDir: process.cwd(), contents: args.path === "next/navigation" ? `import {useSyncExternalStore} from 'react';const subscribe=cb=>{addEventListener('fixture-navigation',cb);addEventListener('popstate',cb);return()=>{removeEventListener('fixture-navigation',cb);removeEventListener('popstate',cb)}};export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname,()=>'/admin')}` : args.path === "logout" ? `import React from 'react';export function LogoutButton(){return <button type="button" className="button button-secondary" disabled>Logout disponível somente no painel real</button>}` : `import React from 'react';export default function Link({href,children,onClick,prefetch,replace,scroll,...props}){return <a href={href} {...props} onClick={e=>{onClick?.(e);if(e.defaultPrevented||e.ctrlKey||e.metaKey||props.target==='_blank')return;e.preventDefault();history.pushState({},'',href);dispatchEvent(new Event('fixture-navigation'))}}>{children}</a>}` }));
} }] });
const globals = readFileSync("app/globals.css", "utf8").replace(/@import\s+["']tailwindcss["'];?/g, "");
const fontFaces = readdirSync(".next/static/chunks").filter(name => name.endsWith(".css")).flatMap(name => [...readFileSync(`.next/static/chunks/${name}`, "utf8").matchAll(/@font-face\{[^}]+\}/g)].map(m => m[0])).filter(face => /font-family:Geist[; ]/.test(face)).join("\n").replaceAll("../media/", "/fonts/");
const fontFiles = new Set(readdirSync(".next/static/media").filter(name => name.endsWith(".woff2")));
const css = `${fontFaces}\n:root{--font-geist-sans:Geist,Arial,sans-serif;--font-geist-mono:monospace}\n${globals}\n${readFileSync("features/institutional/institutional.css", "utf8")}\n${readFileSync("features/admin/admin.css", "utf8")}
${readFileSync("features/demo/demo.css", "utf8")}\n.qa-fixture-notice{position:fixed;bottom:5px;right:8px;max-width:calc(100vw - 16px);padding:4px 8px;border:1px solid #c5a3ff40;border-radius:4px;z-index:3000;background:#211a31;color:#c5a3ff;font:9px/1.5 Arial,sans-serif;pointer-events:none}`;
writeFileSync(`${output}/preview.css`, css);
const html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>UI isolada — Mystra Admin</title><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script type="module" src="/preview.js"></script></body></html>';
const server = createServer((request, response) => {
  response.setHeader("Cache-Control", "no-store"); response.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end(); return; }
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  if (path.startsWith("/fonts/") && fontFiles.has(path.slice(7))) { response.setHeader("Content-Type", "font/woff2"); response.end(readFileSync(`.next/static/media/${path.slice(7)}`)); return; }
  if (path === "/preview.js" || path === "/preview.css") { response.setHeader("Content-Type", path.endsWith(".js") ? "text/javascript" : "text/css"); response.end(readFileSync(`${output}${path}`)); return; }
  if (path === "/" || path.startsWith("/admin")) { response.setHeader("Content-Type", "text/html; charset=utf-8"); response.end(html); return; }
  response.writeHead(404); response.end();
});
server.listen(3112, "127.0.0.1", () => console.log("Isolated UI component preview: http://127.0.0.1:3112/admin — no authentication, database or business operations included."));
