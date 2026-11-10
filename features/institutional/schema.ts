import { z } from "zod";
import { templateDefinitions } from "./template-definitions";
export const pageIds = ["home", "sobre"] as const;
export const knownRoutes = ["/", "/sobre", "/servicos", "/portfolio", "/academia", "/blog", "/eventos", "/contato", "/orcamento", "/trabalhe-conosco", "/privacidade"] as const;
export function safeSiteLink(value: string) {
  if (!value || /[\s\\\x00-\x1f\x7f]/.test(value)) return false;
  if (/^#[a-zA-Z][\w-]*$/.test(value)) return true;
  if (value.startsWith("/") && !value.startsWith("//")) { try { const u = new URL(value, "https://local.invalid"); return u.origin === "https://local.invalid" && (knownRoutes as readonly string[]).some(route => u.pathname === route || ["/servicos", "/portfolio", "/blog", "/eventos", "/trabalhe-conosco"].includes(route) && u.pathname.startsWith(`${route}/`)); } catch { return false; } }
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
}
const text = (max: number) => z.string().trim().max(max);
export const siteLink = text(2048).refine(safeSiteLink, "Use uma rota pública existente, âncora ou URL HTTPS sem credenciais.");
const optionalLink = siteLink.or(z.literal(""));
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const mediaId = id.or(z.literal(""));
const base = { id, label: text(120).min(1), visible: z.boolean() };
const button = z.object({ label: text(100).min(1), href: siteLink });
const templateVariants = Object.keys(templateDefinitions) as [keyof typeof templateDefinitions, ...(keyof typeof templateDefinitions)[]];
const templateSchema = z.object({ ...base, type: z.literal("template"), variant: z.enum(templateVariants), fields: z.record(z.string(), text(3500)), imageId: mediaId, secondaryImageId: mediaId, align: z.enum(["original", "center"]), limit: z.number().int().min(1).max(12), feedOrder: z.enum(["order", "recent"]) }).superRefine((s, ctx) => {
  const fields = templateDefinitions[s.variant].fields;
  if (Object.keys(s.fields).length !== Object.keys(fields).length || Object.keys(s.fields).some(k => !Object.hasOwn(fields, k))) ctx.addIssue({ code: "custom", message: "Os campos não correspondem ao componente permitido." });
  for (const [key, definition] of Object.entries(fields)) {
    const value = s.fields[key]; if (!value || definition.kind === "link" && !safeSiteLink(value)) ctx.addIssue({ code: "custom", path: ["fields", key], message: "Informe um texto ou destino válido para este campo." });
  }
});
const item = z.object({ title: text(160).min(1), text: text(1800), icon: z.enum(["spark", "code", "orbit", "compass"]), href: optionalLink });
export const sectionSchema = z.discriminatedUnion("type", [
  templateSchema,
  z.object({ ...base, type: z.literal("text"), title: text(200).min(1), subtitle: text(200), text: text(8000), imageId: mediaId, align: z.enum(["left", "center"]) }),
  z.object({ ...base, type: z.literal("features"), title: text(200).min(1), text: text(1500), items: z.array(item).min(1).max(12) }),
  z.object({ ...base, type: z.literal("gallery"), title: text(200).min(1), images: z.array(z.object({ mediaId: id, caption: text(300) })).min(1).max(12) }),
  z.object({ ...base, type: z.literal("faq"), title: text(200).min(1), category: text(100) }),
  z.object({ ...base, type: z.literal("cta"), title: text(200).min(1), text: text(1800), button, variant: z.enum(["lavender", "dark"]) }),
  z.object({ ...base, type: z.literal("feed"), title: text(200).min(1), text: text(1500), kind: z.enum(["SERVICE", "PROJECT", "ARTICLE", "EVENT"]), limit: z.number().int().min(1).max(12), order: z.enum(["order", "recent"]) }),
  z.object({ ...base, type: z.literal("team"), title: text(200).min(1), text: text(1500) }),
  z.object({ ...base, type: z.literal("partners"), title: text(200).min(1), text: text(1500) }),
]);
export type Section = z.infer<typeof sectionSchema>;
export type TemplateSection = Extract<Section, { type: "template" }>;
export const pageSchema = z.object({ page: z.enum(pageIds), seoTitle: text(70).min(1), seoDescription: text(170), sharingImageId: mediaId, sections: z.array(sectionSchema).min(1).max(30) }).superRefine((p, ctx) => {
  if (new Set(p.sections.map(s => s.id)).size !== p.sections.length) ctx.addIssue({ code: "custom", path: ["sections"], message: "Identificadores de seção repetidos." });
  const templates = p.sections.filter(s => s.type === "template"); if (new Set(templates.map(s => s.variant)).size !== templates.length) ctx.addIssue({ code: "custom", message: "Os componentes editoriais originais não podem ser duplicados. Duplique seções complementares compatíveis." });
  const hero = p.sections.filter(s => s.type === "template" && templateDefinitions[s.variant].hero);
  if (hero.length !== 1 || !hero[0].visible || p.sections[0].id !== hero[0].id) ctx.addIssue({ code: "custom", message: "Mantenha um único Hero visível na primeira posição." });
  if (p.sections.some(s => s.type === "template" && templateDefinitions[s.variant].page !== p.page)) ctx.addIssue({ code: "custom", message: "Componente incompatível com a página." });
});
export type PageDocument = z.infer<typeof pageSchema>;
const social = z.object({ id, label: text(60).min(1), href: siteLink.refine(v => v.startsWith("https://"), "Use HTTPS."), visible: z.boolean() });
const navigation = z.object({ id, label: text(60).min(1), href: siteLink, visible: z.boolean() });
export const settingsSchema = z.object({
  general: z.object({ brand: text(60).min(1), displayName: text(80).min(1), description: text(1000), email: z.email().or(z.literal("")), phone: text(40).regex(/^[+()\d .-]*$/), location: text(250), hours: text(300), demonstration: z.literal(true), demonstrationNotice: text(300).min(10).refine(v => /fict[ií]ci[ao]/i.test(v) && /portf[oó]lio|demonstrativ/i.test(v), "Preserve a identificação de empresa fictícia e projeto demonstrativo de portfólio.") }),
  identity: z.object({ logoId: mediaId, lightLogoId: mediaId, darkLogoId: mediaId, faviconId: mediaId, sharingImageId: mediaId, institutionalImageId: mediaId }),
  social: z.array(social).max(12),
  seo: z.object({ title: text(70).min(1), description: text(170), siteName: text(80).min(1), allowIndexing: z.boolean() }),
  communication: z.object({ email: z.email().or(z.literal("")), commercialEmail: z.email().or(z.literal("")), hours: text(300), contactLink: optionalLink }),
  navigation: z.array(navigation).min(1).max(12), navigationCTA: button,
  footer: z.object({ description: text(500), copyright: text(250).min(1), signature: text(120), links: z.array(navigation).max(16), legalLinks: z.array(navigation).max(5), cta: z.object({ visible: z.boolean(), label: text(100).min(1), href: siteLink }) }),
}).superRefine((s, ctx) => {
  for (const list of [s.navigation, s.social, s.footer.links, s.footer.legalLinks]) if (new Set(list.map(i => i.id)).size !== list.length) ctx.addIssue({ code: "custom", message: "Identificadores de links repetidos." });
  if (!s.navigation.some(i => i.visible && i.href === "/sobre") || !s.footer.legalLinks.some(i => i.visible && i.href === "/privacidade")) ctx.addIssue({ code: "custom", message: "Preserve os links essenciais para O Estúdio e Privacidade." });
});
export type SiteSettings = z.infer<typeof settingsSchema>;
const common = { id, name: text(160).min(1), order: z.number().int().min(0).max(10000), published: z.boolean() };
export const teamSchema = z.object({ items: z.array(z.object({ ...common, role: text(150).min(1), description: text(2000), imageId: mediaId, specialties: text(500), links: z.array(button).max(5), conceptual: z.literal(true) })).max(100) });
export const partnerSchema = z.object({ items: z.array(z.object({ ...common, description: text(2000), imageId: mediaId, website: optionalLink, category: text(100), featured: z.boolean(), authorized: z.literal(true) })).max(100) });
export const faqSchema = z.object({ items: z.array(z.object({ id, question: text(300).min(3), answer: text(4000).min(3), category: text(100), pages: z.array(z.enum(["home", "sobre", "contato", "servicos", "academia", "eventos"])).min(1).max(6), order: z.number().int().min(0).max(10000), published: z.boolean() })).max(100) });
export const documentSchemas = { home: pageSchema, sobre: pageSchema, settings: settingsSchema, equipe: teamSchema, parceiros: partnerSchema, faq: faqSchema };
export type DocumentId = keyof typeof documentSchemas;
export const documentIds = Object.keys(documentSchemas) as [DocumentId, ...DocumentId[]];
export type DocumentData = PageDocument | SiteSettings | z.infer<typeof teamSchema> | z.infer<typeof partnerSchema> | z.infer<typeof faqSchema>;
export type Revision = { version: number; at: string; authorId: string; data: DocumentData };
export type DocumentState = { version: number; draft: DocumentData; published: DocumentData | null; editedBy: string; editedAt: string; publishedAt: string | null; history: Revision[]; mediaIds: string[] };
export function parseDocument(key: DocumentId, data: unknown): DocumentData {
  if (JSON.stringify(data)?.length > 180000) throw new Error("Conteúdo muito extenso.");
  const parsed = documentSchemas[key].parse(data); if ((key === "home" || key === "sobre") && (parsed as PageDocument).page !== key) throw new Error("Página incompatível."); return parsed;
}
