import type { DocumentData } from "./schema";
export function revisionDifference(previous: DocumentData, current: DocumentData | null): string[] {
  if (!current) return ["Ainda não há uma publicação atual para comparação."];
  if ("sections" in previous && "sections" in current) {
    const changed = previous.sections.filter(s => JSON.stringify(s) !== JSON.stringify(current.sections.find(c => c.id === s.id))).map(s => s.label);
    const removed = current.sections.filter(s => !previous.sections.some(p => p.id === s.id)).map(s => `${s.label} (ausente nesta versão)`);
    const order = previous.sections.map(s => s.id).join() !== current.sections.map(s => s.id).join() ? ["Ordem das seções"] : [];
    const seo = previous.seoTitle !== current.seoTitle || previous.seoDescription !== current.seoDescription || previous.sharingImageId !== current.sharingImageId ? ["Metadados SEO"] : [];
    return [...changed, ...removed, ...order, ...seo];
  }
  if ("items" in previous && "items" in current) return JSON.stringify(previous.items) === JSON.stringify(current.items) ? [] : ["Itens, conteúdo ou ordem da coleção"];
  if ("general" in previous && "general" in current) return Object.keys(previous).filter(k => JSON.stringify(previous[k as keyof typeof previous]) !== JSON.stringify(current[k as keyof typeof current]));
  return ["Estrutura diferente"];
}
