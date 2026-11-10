# Mystra Insights — implementação e verificação

## Entrega

A rota existente `/blog` recebeu uma composição editorial própria: masthead tipográfico, hero, destaques, categorias reais, catálogo pesquisável, manifesto e CTA. O catálogo consulta PostgreSQL e oferece busca por título/resumo/tag, categoria, tag, ordenação por publicação ou título e paginação. Categorias sem artigos publicados não aparecem na navegação pública. Sem registros, são exibidos estados vazios; nenhuma publicação foi inserida automaticamente.

`/blog/[slug]` utiliza os dados do CMS para autoria, datas, capa, tags, leitura estimada, conteúdo, artigos relacionados e SEO. Há sumário com âncoras únicas, progresso de leitura, links de compartilhamento e cópia da URL com retorno de sucesso/erro. Metadados incluem Open Graph, Twitter e JSON-LD Article escapado. Configure `SITE_URL` com a origem pública real para canonical, URLs absolutas e imagens de compartilhamento. Não é inventado um domínio quando essa variável está ausente.

O CMS existente foi preservado e ampliado: tabela editorial com autor, destaque e datas; arquivamento/restauração; edição de categorias/tags com descrições e associações; indicadores reais e seleção de artigos recentes no dashboard. Os destaques da Home continuam na única seção já existente, consultando conteúdos publicados e destacados; artigos também exibem a data real.

## Editor

Tiptap permite parágrafos, H2/H3/H4, negrito, itálico, listas, citações, links HTTP(S)/internos, separadores, imagens da biblioteca com texto alternativo e legenda, código com destaque e tabelas. Há desfazer/refazer, contagem de palavras, prévia local e ações explícitas de salvamento/publicação. Upload pelo editor utiliza o handler protegido existente; fica indisponível enquanto o Storage não estiver configurado.

O documento JSON é validado no servidor e renderizado como componentes React, sem HTML arbitrário. Imagens aceitam apenas referências `/api/media/[id]`, verificadas na persistência. Código é limitado a 30 mil caracteres por bloco, tabelas a 50 linhas e 20 células por linha, células a spans de 1–20. O documento mantém os limites globais de tamanho, nós e profundidade. Syntax highlighting converte tokens em spans React escapados.

O alerta de alterações não salvas cobre fechamento/recarregamento e navegação por links na mesma aba. O controle nativo de histórico do navegador não é um bloqueio completo. Não há autosave nem agendamento de publicação.

## Rotas e autorização

- Públicas: `/blog`, `/blog/[slug]`.
- Administrativas: `/admin/blog`, `/admin/blog/novo`, `/admin/blog/[id]/editar`, `/admin/blog/[id]/preview`.
- Categorias e tags: `/admin/categorias`, sem duplicar a administração existente.
- Mídias: `/admin/midias`, `POST /api/media`, `GET /api/media/[id]`.
- Dashboard editorial: `/admin?tipo=artigos`.

Escritas continuam exigindo sessão e `content:manage` no servidor. ADMIN e EDITOR autorizados podem gerenciar conteúdo; COMERCIAL não recebe permissão editorial automaticamente. Preview exige autorização e tem indexação bloqueada. Consultas públicas exigem `PUBLISHED` e data válida. Arquivar força DRAFT e remove a publicação; restaurar mantém rascunho. Salvar/publicar/despublicar invalida as páginas públicas e o painel pelo mecanismo existente de revalidação.

## Banco e configuração real

Foram reutilizados Content (ARTICLE), Category, Tag, User, Media, ContentMedia, AdminLog e InstitutionalSetting. Nenhum schema ou enum foi alterado, nenhuma migration foi criada/aplicada e nenhum registro de demonstração foi gravado.

O marcador de arquivo fica em `Content.body.attrs.archived`, compatível com os documentos anteriores. Descrições de taxonomias usam o armazenamento JSON existente em InstitutionalSetting, chave `taxonomy.<tipo>.<id>`, gravado na mesma transação da taxonomia. Isso evita uma alteração estrutural sem autorização.

A auditoria somente de leitura confirmou a conexão com PostgreSQL/Supabase e a migration inicial `20261105000000_postgresql_cms` aplicada. Não havia artigos, categorias, tags, usuários ou mídias cadastrados. `npm run db:check` confirmou novamente `SELECT 1` sem alterar dados.

Pendências locais encontradas:

1. Gerar e configurar `BETTER_AUTH_SECRET` local com pelo menos 32 caracteres; manter `BETTER_AUTH_URL` correspondente à aplicação.
2. Executar `npm run admin:init` seguindo o README, sem senha fixa no código e sem compartilhar credenciais em mensagens.
3. Configurar no servidor `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_STORAGE_BUCKET`. Utilizar bucket privado e políticas conforme o README; não colocar a chave administrativa em variáveis NEXT_PUBLIC.
4. Configurar `SITE_URL` quando houver origem pública definida.
5. Configurar `TEST_DATABASE_URL` em banco exclusivamente de testes para executar a integração PostgreSQL opcional.

## Verificações executadas

- TypeScript e geração de tipos Next: aprovados.
- Build de produção: aprovado.
- Testes: 22 aprovados; 1 integração PostgreSQL ignorada por ausência de TEST_DATABASE_URL.
- Novos testes: âncoras H2–H4 únicas e correspondentes ao renderizador, código/legendas escapados, tabelas e limites, bloqueio de publicação de arquivos, leitura estimada e segurança de URLs/JSON-LD.
- `npm run db:check`: conexão confirmada, sem gravações.
- `prisma migrate status`: aprovado; 1 migration encontrada, banco atualizado, nenhuma pendente.
- `npm audit --omit=dev`: zero vulnerabilidades.
- Chrome headless: `/blog` em 1440, 1024, 768, 390 e 320 px, sem overflow horizontal, um H1 e seis seções. Busca e ordenação submetidas pelo formulário, com retorno vazio filtrado e link para limpar. Capturas locais em `.next/insights-qa/`.
- HTTP: `/blog` e busca retornaram página; slug inexistente acionou notFound do Next; listagem, criação e preview administrativos exigiram login sem expor editor. Na resposta com streaming, o redirecionamento/notFound é transportado pelo protocolo do Next, podendo iniciar com HTTP 200.
- Smoke de `/sobre`, `/servicos`, `/portfolio`: páginas acessíveis.

Não foram homologados o CRUD autenticado, a publicação/despublicação persistida, o upload no Supabase, os recursos de leitura em artigo real publicado nem o painel autenticado em navegador. A base vazia e a falta de configuração de autenticação/Storage impedem esses testes positivos. Os testes de renderização usam documentos isolados em memória, sem inserir conteúdo no banco da aplicação. Portanto, a entrega do código não equivale à homologação integral do fluxo editorial.

## Arquivos principais

Criados: `features/insights/{insights-page,catalog,article-cards,article-detail,public-detail,reading-tools,highlight}.tsx`, `features/insights/{article-utils,seo,use-unsaved}.ts`, `features/insights/insights.css`, `tests/insights.test.ts`, este relatório.

Alterados: rotas públicas `[slug]/page.tsx` e `[slug]/[entry]/page.tsx`; `app/admin/(protected)/page.tsx`; `features/cms/{editor,rich-content,content-form,content-detail,public-content,admin-list,content-row-actions,list-controls}.tsx`; `features/cms/{rich-text,schema,actions,filters}.ts`; `features/taxonomy/{manager,page-content}.tsx`, `features/taxonomy/actions.ts`; `package.json`, `package-lock.json`, `.env.example`, `README.md`.

Dependências adicionadas: `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-table`, `lowlight`.

## Homologação recomendada

Após configurar o ambiente: criar um artigo real autorizado como rascunho; verificar preview privado; editar todos os tipos de bloco; selecionar/enviar imagens; publicar; confirmar detalhes, metadados, sumário, progresso e compartilhamento; testar busca/tags/categorias/paginação com registros; despublicar/arquivar e verificar indisponibilidade pública; testar EDITOR e COMERCIAL; confirmar recusa da exclusão de mídia em uso. Nenhum deploy foi realizado.
