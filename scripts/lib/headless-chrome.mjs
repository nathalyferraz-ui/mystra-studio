import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
export async function headlessChrome() {
  const executable = [process.env.AUDIT_CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean).find(existsSync);
  if (!executable) throw new Error("Chrome unavailable; configure AUDIT_CHROME_PATH locally.");
  const output = resolve(".next/cache/admin-redesign"); mkdirSync(output, { recursive: true });
  const profile = mkdtempSync(join(output, "component-browser-"));
  const child = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore", windowsHide: true });
  let failed = false; child.on("error", () => { failed = true; });
  for (let n = 0; n < 150 && !failed; n++) {
    const file = join(profile, "DevToolsActivePort");
    if (existsSync(file)) { const port = Number(readFileSync(file, "utf8").split("\n")[0]); if (Number.isInteger(port) && port > 0 && port < 65536) return { port, stop: () => child.kill() }; }
    await new Promise(done => setTimeout(done, 100));
  }
  child.kill(); throw new Error("Local component-test browser could not start.");
}
