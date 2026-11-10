import type { z } from "zod";
import type { faqSchema } from "./schema";
// Existing authored contact copy, offered as an editable default, never automatically inserted.
export const defaultContactFAQs: z.infer<typeof faqSchema>["items"] = [
  { id: "contact-faq-1", question: "Como apresentar uma ideia?", answer: "Conte o que deseja construir, para quem e qual necessidade pretende atender. Não é necessário ter todas as definições prontas para iniciar uma conversa.", category: "Processo", pages: ["contato"], order: 0, published: true },
  { id: "contact-faq-2", question: "O que ajuda na preparação de um orçamento?", answer: "Objetivos, funcionalidades esperadas, referências e restrições ajudam a compreender o escopo. O formulário de orçamento organiza essas informações sem representar uma proposta comercial ou contratação.", category: "Processo", pages: ["contato"], order: 1, published: true },
  { id: "contact-faq-3", question: "Existe um prazo padrão para desenvolver um projeto?", answer: "Cada projeto depende do escopo, das integrações e das etapas necessárias. Prazos e condições precisam ser discutidos antes de qualquer compromisso.", category: "Processo", pages: ["contato"], order: 2, published: true },
  { id: "contact-faq-4", question: "Posso conversar sem escolher um serviço?", answer: "Sim. Você pode descrever sua necessidade e deixar o serviço em definição. As soluções publicadas no catálogo são uma referência para a conversa.", category: "Processo", pages: ["contato"], order: 3, published: true },
];
