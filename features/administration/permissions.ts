export const permissionCatalog = {
  "content:manage": "CMS existente: serviços, portfólio, blog, mídias e eventos",
  "pages:read": "Consultar páginas e prévias institucionais",
  "pages:update": "Editar rascunhos de páginas",
  "pages:publish": "Publicar páginas institucionais",
  "institutional:manage": "Gerenciar equipe, parceiros e FAQ",
  "requests:manage": "CRM e solicitações comerciais",
  "recruitment:manage": "Candidaturas e currículos privados",
  "settings:manage": "Configurações, identidade e navegação",
  "users:manage": "Consultar usuários e administrar acesso limitado",
  "audit:read": "Consultar logs administrativos",
} as const;
export type PermissionCode = keyof typeof permissionCatalog;
