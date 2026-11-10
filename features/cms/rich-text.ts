export type RichNode = {
  type: string; text?: string;
  attrs?: { level?: number; start?: number; href?: string; src?: string; alt?: string; title?: string | null; caption?: string; language?: string; colspan?: number; rowspan?: number; archived?: boolean };
  marks?: { type: string; attrs?: { href?: string } }[];
  content?: RichNode[];
};
export const emptyDocument: RichNode = { type: "doc", content: [{ type: "paragraph" }] };
export const codeLanguages = ["plaintext", "javascript", "typescript", "css", "html", "json", "bash", "python", "sql"] as const;
export function safeHref(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || /[\x00-\x20\x7f\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
export function mediaIdFromSource(src: string) { return /^\/api\/media\/([a-zA-Z0-9_-]{1,100})$/.exec(src)?.[1]; }
export function parseRichDocument(input: unknown): RichNode {
  if (JSON.stringify(input)?.length > 400000) throw new Error("Conteúdo muito extenso.");
  let count = 0;
  function visit(value: unknown, depth: number, parent?: string): RichNode {
    if (++count > 5000 || depth > 15 || !value || typeof value !== "object") throw new Error("Documento inválido.");
    const node = value as Record<string, unknown>;
    const type = String(node.type);
    if (!["doc", "paragraph", "heading", "text", "bulletList", "orderedList", "listItem", "blockquote", "image", "horizontalRule", "hardBreak", "codeBlock", "table", "tableRow", "tableCell", "tableHeader"].includes(type)) throw new Error("Elemento não permitido.");
    if (depth === 0 && type !== "doc" || depth > 0 && type === "doc") throw new Error("Documento inválido.");
    const allowedChildren: Record<string, string[]> = {
      doc: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "image", "horizontalRule", "codeBlock", "table"],
      paragraph: ["text", "hardBreak"], heading: ["text", "hardBreak"],
      bulletList: ["listItem"], orderedList: ["listItem"],
      listItem: ["paragraph", "bulletList", "orderedList", "blockquote"],
      blockquote: ["paragraph", "heading", "bulletList", "orderedList"],
      codeBlock: ["text"], table: ["tableRow"], tableRow: ["tableCell", "tableHeader"],
      tableCell: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock"],
      tableHeader: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock"],
    };
    if (parent && !allowedChildren[parent]?.includes(type)) throw new Error("Estrutura de documento inválida.");
    const result: RichNode = { type };
    const attrs = (node.attrs ?? {}) as Record<string, unknown>;
    if (type === "doc" && attrs.archived !== undefined) {
      if (typeof attrs.archived !== "boolean") throw new Error("Estado editorial inválido.");
      result.attrs = { archived: attrs.archived };
    }
    if (type === "text") {
      if (typeof node.text !== "string" || node.text.length > 100000) throw new Error("Texto inválido.");
      result.text = node.text;
      if (node.marks !== undefined) {
        if (parent === "codeBlock" && Array.isArray(node.marks) && node.marks.length) throw new Error("Use texto sem formatação nos blocos de código.");
        if (!Array.isArray(node.marks) || node.marks.length > 3) throw new Error("Formatação inválida.");
        result.marks = node.marks.map(mark => {
          if (!["bold", "italic", "link"].includes(mark?.type)) throw new Error("Formatação não permitida.");
          if (mark.type === "link" && !safeHref(mark.attrs?.href)) throw new Error("Link inválido. Use HTTP(S) ou caminho interno.");
          return mark.type === "link" ? { type: "link", attrs: { href: mark.attrs.href } } : { type: mark.type };
        });
      }
    }
    if (type === "heading") { if (![2, 3, 4].includes(Number(attrs.level))) throw new Error("Use títulos H2, H3 ou H4."); result.attrs = { level: Number(attrs.level) }; }
    if (type === "codeBlock") result.attrs = { language: codeLanguages.includes(attrs.language as typeof codeLanguages[number]) ? String(attrs.language) : "plaintext" };
    if (type === "tableCell" || type === "tableHeader") {
      const colspan = attrs.colspan ?? 1, rowspan = attrs.rowspan ?? 1;
      if (![colspan, rowspan].every(v => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 20)) throw new Error("Dimensões de célula inválidas.");
      result.attrs = { colspan: Number(colspan), rowspan: Number(rowspan) };
    }
    if (type === "orderedList") result.attrs = { start: Math.max(1, Math.min(10000, Number(attrs.start) || 1)) };
    if (type === "image") {
      if (typeof attrs.src !== "string" || !mediaIdFromSource(attrs.src)) throw new Error("Selecione imagens da biblioteca.");
      result.attrs = { src: attrs.src, alt: String(attrs.alt ?? "").slice(0, 300), title: String(attrs.title ?? "").slice(0, 300), ...(attrs.caption ? { caption: String(attrs.caption).slice(0, 500) } : {}) };
    }
    if (node.content !== undefined) {
      if (!Array.isArray(node.content) || !allowedChildren[type]) throw new Error("Conteúdo inválido.");
      if (type === "table" && node.content.length > 50 || type === "tableRow" && node.content.length > 20) throw new Error("A tabela deve ter até 50 linhas e 20 células por linha.");
      result.content = node.content.map(child => visit(child, depth + 1, type));
      if (type === "codeBlock" && richText(result).length > 30000) throw new Error("Bloco de código muito extenso.");
    }
    return result;
  }
  return visit(input, 0);
}
export function richText(node: RichNode): string { return [node.text ?? "", ...(node.content ?? []).map(richText)].join(" "); }
export function richMediaIds(node: RichNode): string[] {
  return [...new Set([...(node.type === "image" && node.attrs?.src ? [mediaIdFromSource(node.attrs.src)!] : []), ...(node.content ?? []).flatMap(richMediaIds)])];
}
export type RichHeading = { id: string; text: string; level: number };
export function richHeadings(node: RichNode, prefix = "insight"): RichHeading[] {
  const headings: RichHeading[] = [];
  function visit(current: RichNode) {
    if (current.type === "heading") {
      const text = richText(current).trim();
      const slug = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "secao";
      headings.push({ id: `${prefix}-${headings.length + 1}-${slug}`, text, level: current.attrs?.level ?? 2 });
    }
    current.content?.forEach(visit);
  }
  visit(node); return headings;
}
