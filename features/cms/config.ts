export const cmsModules = {
  servicos: { kind: "SERVICE", label: "Serviços", singular: "serviço" },
  portfolio: { kind: "PROJECT", label: "Portfólio", singular: "projeto" },
  blog: { kind: "ARTICLE", label: "Blog", singular: "artigo" },
} as const;
export type CmsModule = keyof typeof cmsModules;
export function isCmsModule(value: string): value is CmsModule { return Object.hasOwn(cmsModules, value); }
export function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 150); }
