import type { ReactNode } from "react";
import type { RootContent } from "hast";
import { common, createLowlight } from "lowlight";
export const insightLowlight = createLowlight(common);
function token(node: RootContent, key: number): ReactNode {
  if (node.type === "text") return node.value;
  if (node.type !== "element" || node.tagName !== "span") return null;
  const classes = Array.isArray(node.properties.className) ? node.properties.className.filter(c => typeof c === "string" && /^hljs-[a-z0-9_-]+$/i.test(c)).join(" ") : "";
  return <span className={classes} key={key}>{node.children.map(token)}</span>;
}
export function HighlightedCode({ text, language = "plaintext" }: { text: string; language?: string }) {
  if (language === "plaintext" || !insightLowlight.registered(language)) return <code>{text}</code>;
  return <code className={`language-${language}`}>{insightLowlight.highlight(language, text).children.map(token)}</code>;
}
