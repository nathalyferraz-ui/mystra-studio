import { publicSiteOrigin } from "@/lib/site-policy";
import { parseRichDocument, richText } from "@/features/cms/rich-text";
export function articleStats(value: unknown) {
  const text = richText(parseRichDocument(value)).trim();
  const words = text ? text.split(/\s+/u).filter(Boolean).length : 0;
  return { words, minutes: Math.max(1, Math.ceil(words / 200)) };
}
export function articleArchived(value: unknown) { return parseRichDocument(value).attrs?.archived === true; }
export const siteOrigin = publicSiteOrigin;
export function serializeStructuredData(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }
