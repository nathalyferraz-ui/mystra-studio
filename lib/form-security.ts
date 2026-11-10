import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { authenticationValues, isDemoEnvironment } from "./environment";
export function formSecret() { if (isDemoEnvironment()) return null; const secret = process.env.CRM_FORM_SECRET || authenticationValues().secret; return secret && secret.length >= 32 ? secret : null; }
export function digest(value: string, secret: string) { return createHmac("sha256", secret).update(value).digest("hex"); }
export function createFormToken(secret: string, now = Date.now()) { const value = `${now}.${randomUUID()}`; return `${value}.${digest(value, secret)}`; }
export function verifyFormToken(token: string, secret: string, now = Date.now()) {
  const match = /^(\d{13})\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token);
  if (!match || now - Number(match[1]) < 2000 || now - Number(match[1]) > 2 * 60 * 60 * 1000) return false;
  const expected = Buffer.from(digest(`${match[1]}.${match[2]}`, secret), "hex");
  return timingSafeEqual(expected, Buffer.from(match[3], "hex"));
}
