import { z } from "zod";
import { emptyDocument, parseRichDocument, type RichNode } from "@/features/cms/rich-text";

export const PROJECT_FORMAT = "mystra.project.v1";
const projectSchema = z.object({
  format: z.literal(PROJECT_FORMAT),
  conceptual: z.boolean().default(false),
  archived: z.boolean().default(false),
  context: z.string().trim().max(20000).default(""),
  resultsMode: z.enum(["DESCRIPTIVE", "DEMONSTRATIVE"]).default("DESCRIPTIVE"),
  galleryCaptions: z.record(z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), z.string().trim().max(300)).default({}).refine(v => Object.keys(v).length <= 30),
  process: z.unknown().transform((value, ctx) => {
    try { return parseRichDocument(value); }
    catch { ctx.addIssue({ code: "custom", message: "Revise o documento do processo criativo." }); return z.NEVER; }
  }),
}).strict();
export type ProjectEditorial = z.infer<typeof projectSchema>;
export function emptyProjectEditorial(): ProjectEditorial { return { format: PROJECT_FORMAT, conceptual: false, archived: false, context: "", resultsMode: "DESCRIPTIVE", galleryCaptions: {}, process: emptyDocument }; }
export function isProjectEditorial(value: unknown): value is ProjectEditorial {
  return Boolean(value && typeof value === "object" && "format" in value);
}
export function parseProjectEditorial(value: unknown): ProjectEditorial {
  if (isProjectEditorial(value)) return projectSchema.parse(value);
  return { format: PROJECT_FORMAT, conceptual: false, archived: false, context: "", resultsMode: "DESCRIPTIVE", galleryCaptions: {}, process: parseRichDocument(value ?? emptyDocument) };
}
export function parseContentBody(value: unknown): RichNode | ProjectEditorial {
  return isProjectEditorial(value) ? parseProjectEditorial(value) : parseRichDocument(value);
}
export function bodyDocument(value: RichNode | ProjectEditorial): RichNode {
  return isProjectEditorial(value) ? value.process : value;
}
export function moveGalleryImage(ids: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return ids;
  const result = [...ids];
  [result[index], result[target]] = [result[target], result[index]];
  return result;
}
