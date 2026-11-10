import { mediaReferences } from "./repository";
import type { DocumentData, DocumentId } from "./schema";
export function publicInstitutionalMediaIds(key: DocumentId, document: DocumentData) {
  if ((key === "home" || key === "sobre") && "sections" in document) return mediaReferences({ sharingImageId: document.sharingImageId, sections: document.sections.filter(s => s.visible) });
  if ((key === "equipe" || key === "parceiros") && "items" in document) return mediaReferences(document.items.filter(i => i.published));
  return key === "settings" ? mediaReferences(document) : [];
}
