import { randomBytes } from "node:crypto";
import { parse } from "dotenv";
import { authConfiguration } from "./auth-config";

/** Returns local file contents only; callers must never log the result. */
export function prepareAuthEnvironment(source: string, generate = () => randomBytes(48).toString("base64url")) {
  const values = parse(source);
  for (const key of ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]) {
    if ((source.match(new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=`, "gm")) || []).length > 1) throw new Error("DUPLICATE_AUTH_VARIABLE");
  }
  const secretCreated = !values.BETTER_AUTH_SECRET, originAdded = !values.BETTER_AUTH_URL;
  const secret = secretCreated ? generate() : values.BETTER_AUTH_SECRET;
  const origin = originAdded ? "http://localhost:3000" : values.BETTER_AUTH_URL;
  if (!authConfiguration({ ...values, BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: origin, NODE_ENV: "development" }).configured) throw new Error("REVIEW_AUTH_CONFIGURATION");
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  let contents = source;
  function set(key: string, value: string) {
    const line = `${key}="${value}"`;
    const pattern = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=[^\\r\\n]*(?=\\r?$)`, "gm");
    if (pattern.test(contents)) contents = contents.replace(pattern, () => line);
    else contents += `${contents.endsWith("\n") ? "" : newline}${line}${newline}`;
  }
  if (secretCreated) set("BETTER_AUTH_SECRET", secret);
  if (originAdded) set("BETTER_AUTH_URL", origin);
  return { contents, secretCreated, originAdded };
}
