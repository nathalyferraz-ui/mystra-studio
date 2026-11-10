# Portfólio — implementação e verificação

## Funcionalidades implementadas

- `/portfolio` com hero autoral, composição gráfica original, destaques editoriais assimétricos, catálogo, visão criativa e CTA para a rota de contato existente.
- Destaques e catálogo consultam projetos reais no PostgreSQL, sem arrays de trabalhos demonstrativos ou inserções automáticas. A base vazia preserva as cinco seções e apresenta estados vazios distintos para destaques e catálogo.
- Busca por título, categorias e tecnologias provenientes dos registros associados, ordenação e paginação. Parâmetros são preservados na URL, com retorno à âncora do catálogo.
- Cards com capa quando cadastrada, resumo, categoria, tecnologias e identificação conceitual somente quando configurada no CMS.
- `/portfolio/[slug]` com apresentação de estudo de caso, descrição, contexto, desafio, solução, processo criativo, galeria, tecnologias e resultados. Seções complementares aparecem somente com conteúdo cadastrado.
- Galeria com imagens de proporções preservadas, ordenação, legendas opcionais, alt, visualização ampliada em dialog nativo, botões anterior/próxima e suporte às setas do teclado/Escape.
- Navegação anterior/próximo por ordem editorial e ID, relacionados publicados e metadados SEO do registro.
- Painel com miniatura, datas de criação/edição, filtros por tecnologia e arquivamento, além das ações de edição, prévia, publicação, despublicação e exclusão já existentes.
- Formulário com contexto, editor rico do processo criativo, natureza conceitual/demonstrativa, natureza dos resultados, imagens ordenáveis e legendas. Permite selecionar mídias existentes, pré-visualizar arquivos, enviar imagens pelo endpoint real e remover associações preservando os arquivos.
- Arquivar retira o projeto da publicação. Restaurar mantém o projeto como rascunho, exigindo publicação explícita posterior.

## Auditoria e banco

A integração PostgreSQL/Supabase está acessível. A migration `20261105000000_postgresql_cms` está aplicada. Na auditoria desta execução havia zero projetos, categorias de projeto, mídias e usuários. Nenhum registro de demonstração foi criado.

Modelos reutilizados: Content com kind PROJECT, Category com kind PROJECT, Technology, Media e ContentMedia. A galeria usa os relacionamentos e o campo position já existentes. As operações continuam usando Prisma e Better Auth, com content:manage verificado no servidor, validação Zod, versões otimistas, transações e logs.

Não houve alteração de schema, nova tabela, migration ou dependência. As rotas existentes foram reaproveitadas, sem criar uma segunda estrutura de portfólio.

## Adaptação ao schema atual

Content.body já era JSON. Para projetos, o documento editorial agora aceita o formato versionado `mystra.project.v1`:

| Campo no JSON | Uso |
| --- | --- |
| format | Identificação e evolução controlada do documento |
| conceptual | Identificação explícita de projeto conceitual/demonstrativo |
| archived | Identificação de arquivo; só aceita status DRAFT |
| context | Contexto complementar à descrição existente |
| process | Documento rico validado para o processo criativo |
| resultsMode | DESCRIPTIVE ou DEMONSTRATIVE; demonstrações recebem aviso público |
| galleryCaptions | Legendas por ID de mídia, limitadas e preservadas somente para imagens da galeria |

Documentos ricos legados continuam aceitos: são lidos como processo, sem inventar contexto ou natureza do projeto. A conversão é feita ao ler/salvar um registro, sem uma atualização automática dos dados no banco.

Arquivado não é um novo valor no enum PostgreSQL: é um subtipo editorial de DRAFT. O schema do servidor rejeita publicação com archived=true; a ação de arquivamento força DRAFT e remove publishedAt. Todas as consultas públicas e a entrega de mídia continuam exigindo PUBLISHED e data válida. O filtro administrativo Não publicados abrange rascunhos e arquivados; Arquivado seleciona especificamente o marcador JSON.

Os campos existentes description, challenge, solution, results, externalUrl, featured, sortOrder, seoTitle e seoDescription foram preservados. Imagens ainda exigem registros de Media válidos e disponíveis. Legendas de mídias removidas da galeria são descartadas no próximo salvamento.

## Integração com a Home

A Home já possui FeaturedContent, que consulta conteúdos publicados e marcados como destaque. A seção foi reutilizada, sem criar uma segunda área de projetos. O campo featured do projeto alimenta essa consulta e os destaques do portfólio. A identificação conceitual foi adicionada aos cards existentes quando aplicável.

Sem projetos publicados, a Home continua sem exibir trabalhos inexistentes. As mutações mantêm a invalidação do layout raiz, cobrindo Home, catálogo, detalhes, relacionados e alterações de slug. A restauração de arquivo não republica automaticamente.

## Arquivos

Criados em `features/portfolio`:

- `portfolio-page.tsx`: composição pública.
- `catalog.tsx`: consultas de destaques, filtros e estados de dados.
- `project-cards.tsx`: galeria editorial e cards.
- `project-detail.tsx`: estudo de caso.
- `public-detail.tsx`: relacionados e navegação publicada.
- `gallery.tsx`: galeria ampliável acessível.
- `media-picker.tsx`: seleção, upload, ordenação e legendas.
- `editorial.ts`: formato JSON, compatibilidade e ordenação imutável.
- `portfolio.css`: estilos isolados com prefixo ms-work e reduced motion.

Outros arquivos criados: `tests/portfolio.test.ts` e este relatório.

Alterados: `app/(public)/[slug]/page.tsx`, `features/cms/schema.ts`, `actions.ts`, `filters.ts`, `queries.ts`, `edit-page.tsx`, `content-form.tsx`, `content-row-actions.tsx`, `admin-list.tsx`, `list-controls.tsx`, `content-detail.tsx` e `public-content.tsx`. O README recebeu instruções da modelagem e do uso do módulo. Os caminhos de Soluções e Sobre foram preservados; os componentes compartilhados só ganham comportamento de projeto quando o módulo é portfolio.

Reutilizados: Button, ButtonLink, Input, Select, Badge, Table, EmptyState, Pagination, RichEditor/Tiptap, RichContent, listContent, contentInclude, publishedItem, ações e autorização do CMS, biblioteca e endpoint de mídia existentes.

## Testes e verificações

| Verificação | Resultado |
| --- | --- |
| npm run lint | Aprovado sem erros/avisos |
| npm run typecheck | Aprovado |
| npm test | 18 testes aprovados e uma integração PostgreSQL ignorada sem TEST_DATABASE_URL |
| npm run build | Aprovado |
| Consulta real ao PostgreSQL | Aprovada; migration inicial aplicada; tabelas disponíveis e sem projetos |
| /portfolio | HTTP 200, cinco seções, destaques e catálogo vazios reais |
| Busca e ordenação no navegador | GET preserva q, sort e #projetos; estado filtrado correto |
| Limpar filtros | Campo limpo e parâmetros removidos |
| Categorias/tecnologias com base vazia | Somente opção Todas, sem registros inventados |
| Responsividade | Chrome headless em 1440, 1024, 768, 390 e 320 px; sem rolagem horizontal ou títulos excedentes |
| Acessibilidade conferida | Um H1, seções identificadas, labels, foco visível e animações desativadas com reduced motion |
| /portfolio/projeto-inexistente | Tratamento 404 sem conteúdo de projeto |
| /admin/portfolio, /novo e /{id}/preview sem sessão | Redirecionamento ao login |
| /portfolio?status=ARCHIVED | Não altera a exigência de publicação da consulta pública |
| /sobre e /servicos | HTTP 200 após as alterações |

Capturas desktop/mobile foram inspecionadas e ficam na pasta de QA ignorada pelo Git. Os testes novos verificam compatibilidade com documentos legados, bloqueio de publicação de arquivos, isolamento dos metadados ao portfólio, validação de processo/legendas/resultados/URLs, ordenação estável e imutável de imagens e restrição dos filtros públicos.

O Next pode emitir redirecionamento ou tratamento 404 no stream após HTTP 200. Os checks observaram esses marcadores, sem interpretar o status inicial como autorização.

## Pendências e limites reais

BETTER_AUTH_SECRET ainda não está configurado conforme a exigência do aplicativo e não há administrador cadastrado. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_STORAGE_BUCKET também não estão configurados. Nenhuma credencial foi solicitada em mensagem, exibida ou alterada.

Por esses motivos, **não foram homologados** no painel real: cadastro/edição e persistência por Server Action, prévia autenticada, publicação/despublicação/arquivamento, upload remoto, ordenação após salvamento e visualização ampliada com arquivos reais. Os mecanismos foram implementados, mas testes de validação e build não substituem esse fluxo.

Sem projetos publicados, também permanecem pendentes a verificação positiva de detalhes, metadados específicos, anterior/próximo, relacionados, destaques e paginação com múltiplos registros. Nenhum dado fictício foi inserido para simular esses cenários.

Para completar a homologação, configure o segredo e a origem de autenticação, inicialize o primeiro administrador pelo comando controlado do README e configure um bucket privado de mídia. Depois use um projeto legítimo, identificando expressamente estudos conceituais e resultados demonstrativos.

## Melhorias futuras

- Homologar o fluxo completo e automatizá-lo em banco/Storage de testes isolados.
- Se o volume justificar, promover os marcadores editoriais JSON a colunas indexadas, com migration previamente revisada e autorizada.
- Evoluir a biblioteca com seleção paginada de mídias e revisão de descrições alternativas.

Nenhum deploy, alteração de schema, reset ou escrita de conteúdo no banco da aplicação foi executado nesta entrega.
