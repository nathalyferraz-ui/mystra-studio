import { z } from "zod";
export const leadTypes = { ORCAMENTO: "Solicitar orçamento", SERVICOS: "Dúvidas sobre serviços", PARCERIAS: "Parcerias", CURSOS: "Dúvidas sobre cursos", GERAL: "Contato geral" } as const;
export const statuses = { NOVO: "Novo", EM_ANALISE: "Em análise", EM_CONTATO: "Em contato", PROPOSTA_ENVIADA: "Proposta enviada", CONCLUIDO: "Concluído", ARQUIVADO: "Arquivado" } as const;
export const priorities = { BAIXA: "Baixa", NORMAL: "Normal", ALTA: "Alta", URGENTE: "Urgente" } as const;
export const privacyVersion = "comercial-2026-11-v1";
const text = (max: number) => z.string().trim().max(max);
export const leadSchema = z.object({
  name: text(120).min(3, "Informe seu nome completo."),
  email: z.email("Informe um e-mail válido.").max(254).transform(v => v.toLowerCase()),
  phone: text(30).refine(v => !v || /^[+()\d\s.-]{7,30}$/.test(v) && v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 18, "Confira o telefone."),
  company: text(160), type: z.enum(Object.keys(leadTypes) as [keyof typeof leadTypes, ...(keyof typeof leadTypes)[]]),
  subject: text(180).min(3, "Informe o assunto."), message: text(10000).min(20, "Escreva pelo menos 20 caracteres."),
  projectType: text(180), deadline: text(160), investment: text(160),
  serviceId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).or(z.literal("")),
  privacy: z.literal(true, { error: "Confirme a ciência do aviso de privacidade." }),
  website: z.literal("", { error: "Envio recusado. Atualize a página e tente novamente." }),
  token: z.string().max(300),
}).superRefine((data, ctx) => {
  if (data.type === "ORCAMENTO") {
    if (data.phone.replace(/\D/g, "").length < 7) ctx.addIssue({ code: "custom", path: ["phone"], message: "Informe um telefone para o orçamento." });
    if (data.projectType.length < 3) ctx.addIssue({ code: "custom", path: ["projectType"], message: "Descreva o tipo de projeto." });
    if (!data.deadline) ctx.addIssue({ code: "custom", path: ["deadline"], message: "Informe o prazo desejado ou que ainda está em definição." });
  } else if (data.serviceId) ctx.addIssue({ code: "custom", path: ["serviceId"], message: "O serviço é associado ao formulário de orçamento." });
});
export type LeadInput = z.infer<typeof leadSchema>;
export type LeadResult = { ok: boolean; message: string; errors?: Record<string, string[]> };
export const updateLeadSchema = z.object({ id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/), version: z.number().int().positive(), status: z.enum(Object.keys(statuses) as [keyof typeof statuses, ...(keyof typeof statuses)[]]), priority: z.enum(Object.keys(priorities) as [keyof typeof priorities, ...(keyof typeof priorities)[]]), assigneeId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/).or(z.literal("")), note: text(5000) });
