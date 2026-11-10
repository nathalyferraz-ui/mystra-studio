/* eslint-disable @next/next/no-img-element -- Images are served through the authorized media handler. */
import type { ReactNode } from "react";
import { parseRichDocument, richHeadings, type RichNode } from "./rich-text";
import { HighlightedCode } from "@/features/insights/highlight";
export function RichContent({ value, anchorPrefix }: { value: unknown; anchorPrefix?: string }) {
  let document: RichNode;
  try { document = parseRichDocument(value); } catch { return <p>Este conteúdo não pôde ser exibido.</p>; }
  const headings = anchorPrefix ? richHeadings(document, anchorPrefix) : [];
  let headingIndex = 0;
  function renderNode(node: RichNode, key: number): ReactNode {
    const headingId = node.type === "heading" && anchorPrefix ? headings[headingIndex++]?.id : undefined;
    const children = node.content?.map(renderNode);
    switch (node.type) {
      case "doc": return <div key={key} className="prose">{children}</div>;
      case "paragraph": return <p key={key}>{children}</p>;
      case "heading": return node.attrs?.level === 4 ? <h4 id={headingId} key={key}>{children}</h4> : node.attrs?.level === 3 ? <h3 id={headingId} key={key}>{children}</h3> : <h2 id={headingId} key={key}>{children}</h2>;
      case "text": {
        let text: ReactNode = node.text;
        for (const [index, mark] of (node.marks ?? []).entries()) {
          if (mark.type === "bold") text = <strong key={index}>{text}</strong>;
          if (mark.type === "italic") text = <em key={index}>{text}</em>;
          if (mark.type === "link") text = <a key={index} href={mark.attrs?.href} rel="noopener noreferrer">{text}</a>;
        }
        return <span key={key}>{text}</span>;
      }
      case "bulletList": return <ul key={key}>{children}</ul>;
      case "orderedList": return <ol key={key} start={node.attrs?.start}>{children}</ol>;
      case "listItem": return <li key={key}>{children}</li>;
      case "blockquote": return <blockquote key={key}>{children}</blockquote>;
      case "horizontalRule": return <hr key={key} />;
      case "hardBreak": return <br key={key} />;
      case "image": return node.attrs?.caption ? <figure key={key}><img src={node.attrs.src} alt={node.attrs.alt ?? ""} loading="lazy" /><figcaption>{node.attrs.caption}</figcaption></figure> : <img key={key} src={node.attrs?.src} alt={node.attrs?.alt ?? ""} loading="lazy" />;
      case "codeBlock": return <pre key={key}><HighlightedCode text={(node.content ?? []).map(n => n.text ?? "").join("")} language={node.attrs?.language} /></pre>;
      case "table": return <div className="insight-table-scroll" key={key} role="region" aria-label="Tabela do conteúdo" tabIndex={0}><table><tbody>{children}</tbody></table></div>;
      case "tableRow": return <tr key={key}>{children}</tr>;
      case "tableHeader": return <th key={key} colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan} scope="col">{children}</th>;
      case "tableCell": return <td key={key} colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan}>{children}</td>;
      default: return null;
    }
  }
  return renderNode(document, 0);
}
