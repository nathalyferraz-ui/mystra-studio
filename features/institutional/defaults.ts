import { publicNavigation } from "@/config/navigation";
import { templateDefinitions } from "./template-definitions";
import { defaultContactFAQs } from "./default-faq";
import type { DocumentData, DocumentId, PageDocument, SiteSettings, TemplateSection } from "./schema";
export function defaultPage(page: "home" | "sobre"): PageDocument {
  return { page, seoTitle: page === "home" ? "Mystra Studio — Ideias além do óbvio" : "O estúdio — design, tecnologia e intenção", seoDescription: page === "home" ? "Um estúdio conceitual de tecnologia, design e experiências digitais. Projeto corporativo fictício em desenvolvimento." : "Conheça o universo Mystra Studio: um projeto conceitual de estúdio criativo que conecta desenvolvimento web, UX/UI, branding e soluções digitais.", sharingImageId: "", sections: Object.entries(templateDefinitions).filter(([, v]) => v.page === page).map(([variant, definition]) => ({ id: variant, type: "template", variant: variant as TemplateSection["variant"], label: definition.label, visible: true, fields: Object.fromEntries(Object.entries(definition.fields).map(([key, field]) => [key, field.value])), imageId: "", secondaryImageId: "", align: "original", limit: variant === "home-3" ? 6 : 3, feedOrder: "order" })) };
}
export const defaultSettings: SiteSettings = {
  general: { brand: "mystra", displayName: "Mystra Studio", description: "Entre a ideia e o extraordinário.", email: "", phone: "", location: "", hours: "", demonstration: true, demonstrationNotice: "Mystra Studio é uma empresa fictícia e um projeto conceitual de portfólio." },
  identity: { logoId: "", lightLogoId: "", darkLogoId: "", faviconId: "", sharingImageId: "", institutionalImageId: "" }, social: [],
  seo: { title: "Mystra Studio — Ideias além do óbvio", description: "Um estúdio conceitual de tecnologia, design e experiências digitais. Projeto corporativo fictício em desenvolvimento.", siteName: "Mystra Studio", allowIndexing: true },
  communication: { email: "", commercialEmail: "", hours: "", contactLink: "" },
  navigation: publicNavigation.map((n, i) => ({ ...n, id: `nav-${i}`, visible: true })), navigationCTA: { label: "Vamos conversar", href: "/contato" },
  footer: { description: "Entre a ideia e o extraordinário.", copyright: "© Mystra Studio. Uma empresa fictícia, um projeto autoral.", signature: "Design + tecnologia + intenção", links: [...publicNavigation, { href: "/contato", label: "Contato" }, { href: "/trabalhe-conosco", label: "Mystra Careers" }].map((n, i) => ({ ...n, id: `footer-${i}`, visible: true })), legalLinks: [{ id: "privacy", label: "Privacidade", href: "/privacidade", visible: true }], cta: { visible: false, label: "Vamos conversar", href: "/contato" } },
};
export function defaultDocument(key: DocumentId): DocumentData { return key === "home" || key === "sobre" ? defaultPage(key) : key === "settings" ? structuredClone(defaultSettings) : key === "faq" ? { items: structuredClone(defaultContactFAQs) } : { items: [] }; }
