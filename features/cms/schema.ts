import { z } from "zod";
import { richText, safeHref } from "./rich-text";
import { bodyDocument, isProjectEditorial, parseContentBody } from "@/features/portfolio/editorial";
export const idSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
export const slugSchema = z.string().min(1).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.");
const optionalText = (max: number) => z.string().trim().max(max).default("");
export const contentSchema = z.object({
  id: idSchema.optional(), version: z.number().int().positive().optional(),
  module: z.enum(["servicos", "portfolio", "blog"]),
  title: z.string().trim().min(3, "Informe um título com pelo menos 3 caracteres.").max(180),
  slug: slugSchema, summary: z.string().trim().min(10, "O resumo deve ter pelo menos 10 caracteres.").max(500),
  description: optionalText(40000), challenge: optionalText(20000), solution: optionalText(20000), results: optionalText(20000),
  externalUrl: z.union([z.literal(""), z.url().max(2048).refine(url => /^https?:\/\//i.test(url) && safeHref(url), "Use HTTP ou HTTPS sem credenciais.")]).default(""),
  icon: optionalText(40).refine(value => !value || ["code", "design", "strategy", "web"].includes(value), "Ícone inválido."),
  benefits: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]), featured: z.boolean().default(false), sortOrder: z.number().int().min(0).max(100000).default(0),
  categoryId: idSchema.or(z.literal("")).default(""), coverId: idSchema.or(z.literal("")).default(""),
  authorId: idSchema.optional(), galleryIds: z.array(idSchema).max(30).default([]), tagIds: z.array(idSchema).max(50).default([]), technologyIds: z.array(idSchema).max(50).default([]),
  seoTitle: optionalText(70), seoDescription: optionalText(170),
  body: z.unknown().transform((value, ctx) => {
    try { return parseContentBody(value); } catch { ctx.addIssue({ code: "custom", message: "Documento inválido. Revise o conteúdo e os metadados editoriais." }); return z.NEVER; }
  }),
}).superRefine((data, ctx) => {
  if (data.id && !data.version) ctx.addIssue({ code: "custom", path: ["version"], message: "Versão do conteúdo ausente. Recarregue a página." });
  if (isProjectEditorial(data.body) && data.module !== "portfolio") ctx.addIssue({ code: "custom", path: ["body"], message: "Metadados de projeto são exclusivos do portfólio." });
  if (isProjectEditorial(data.body) && data.body.archived && data.status === "PUBLISHED") ctx.addIssue({ code: "custom", path: ["status"], message: "Restaure o projeto antes de publicar. Projetos arquivados não podem ser públicos." });
  if (!isProjectEditorial(data.body) && data.body.attrs?.archived && data.module !== "blog") ctx.addIssue({ code: "custom", path: ["body"], message: "O marcador de arquivo deste documento é exclusivo dos artigos." });
  if (!isProjectEditorial(data.body) && data.body.attrs?.archived && data.status === "PUBLISHED") ctx.addIssue({ code: "custom", path: ["status"], message: "Restaure o artigo antes de publicar." });
  if (data.status === "PUBLISHED" && data.module === "blog" && richText(bodyDocument(data.body)).trim().length < 20) ctx.addIssue({ code: "custom", path: ["body"], message: "Escreva o artigo antes de publicar (mínimo de 20 caracteres)." });
  if (data.status === "PUBLISHED" && data.module !== "blog" && data.description.length < 20) ctx.addIssue({ code: "custom", path: ["description"], message: "Descreva o conteúdo antes de publicar (mínimo de 20 caracteres)." });
});
export type ContentInput = z.infer<typeof contentSchema>;
export type ActionResult = { ok: boolean; message: string; errors?: Record<string, string[]>; id?: string };
