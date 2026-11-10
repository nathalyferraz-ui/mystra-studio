# Mystra Studio — CMS e auditoria técnica
Preparação de demonstração (07/11/2026): consulte [CONFIGURAR-DEMO.md](CONFIGURAR-DEMO.md) e [AMBIENTE-DEMO.md](AMBIENTE-DEMO.md). O projeto separado mystra-studio-demo foi criado pela proprietária; .env.demo foi preparado e aguarda o preenchimento das conexões. `npm run demo:check` confere os destinos sem conectar; `npm run demo:check -- --connect` realiza somente consultas READ ONLY. Configurações isoladas, seed protegido e exploração somente leitura estão implementados; homologação independente continua pendente. Nenhum seed, migration ou conta demo foi executado no banco atual. Não use o banco principal para a demonstração.
Estado atual (06/11/2026): consulte [AUDITORIA-GERAL.md](AUDITORIA-GERAL.md). Relatos anteriores são históricos; Academy e Documentos ainda não possuem CRUD persistente. O sistema completo não está homologado para deploy.

Aplicação corporativa autoral de uma empresa **inteiramente fictícia**. Next.js 16.4.5, React 19.3, TypeScript, Tailwind 4, Prisma 7.10.1 e Better Auth 1.7.17. A identidade da Etapa 1 foi preservada; o banco oficial agora é **PostgreSQL no Supabase**.

## Instalar e iniciar

Ambiente verificado: Node.js 26.13 e npm 11.20. Use uma versão LTS compatível com Prisma 7 (Node.js 22.12+).

```sh
npm install
npm run dev
```

Abra http://localhost:3000. Se um servidor deste projeto já estiver aberto, reutilize-o. O postinstall gera o cliente Prisma; se a política do npm bloquear scripts, revise a liberação local e execute `npm run db:generate`. O cliente gerado não é versionado.

Sem banco configurado, o portal institucional continua acessível, os módulos públicos informam que não podem consultar o catálogo e o painel permanece bloqueado. Não existe login simulado. Para executar a build local: `npm run build` e `npm start`.

## Estado real da integração

Em 05/11/2026, após autorização explícita, a migration `20261105000000_postgresql_cms` foi aplicada com `npm run db:deploy`. As conexões de execução (`DATABASE_URL`) e migrations (`DIRECT_URL`) foram confirmadas no mesmo projeto Supabase. Foram verificadas as 19 tabelas de aplicação, 112 colunas, chaves primárias, 26 índices adicionais, 17 chaves estrangeiras, quatro enums e RLS nas 19 tabelas. O histórico e o checksum correspondem ao SQL autorizado; `prisma migrate status` informa que o banco está atualizado. Nenhuma outra migration, seed ou reset foi executado. Veja [RELATORIO-MIGRATION-INICIAL.md](RELATORIO-MIGRATION-INICIAL.md).

Atualização de 07/11/2026: Better Auth foi configurado e a primeira conta ADMIN foi criada interativamente pela proprietária. Login, dashboard, manutenção da sessão, logout e proteção posterior de /admin foram confirmados por ela. O banco atual possui quatro migrations sincronizadas. Storage e CRUDs em banco independente continuam pendentes de homologação. Não coloque credenciais em mensagens ou arquivos públicos. A auditoria anterior à aplicação está em [AUDITORIA-ETAPA-3.md](AUDITORIA-ETAPA-3.md).

## Variáveis de ambiente

Copie `.env.example` para `.env`. Prisma CLI, scripts e testes carregam `.env`; o Next também o utiliza. Mantenha valores locais consistentes e reinicie o servidor após alterações. Nunca versione o arquivo preenchido.

| Variável | Finalidade |
| --- | --- |
| DATABASE_URL | URL real PostgreSQL de execução, copiada do painel Connect do Supabase |
| DIRECT_URL | URL real para CLI/migrations: conexão direta ou session pooler |
| SHADOW_DATABASE_URL | Banco shadow independente; usado somente em migrate dev |
| BETTER_AUTH_URL | Origem exata do app, local: http://localhost:3000 |
| BETTER_AUTH_SECRET | Segredo aleatório de pelo menos 32 caracteres |
| SUPABASE_URL | URL real da API do projeto Supabase |
| SUPABASE_SERVICE_ROLE_KEY | Chave secreta de servidor para Storage, nunca no navegador |
| SUPABASE_STORAGE_BUCKET | Nome exato de um bucket privado previamente criado |
| TEST_DATABASE_URL | Opcional: banco PostgreSQL separado para testes de integração |

Não use prefixo `NEXT_PUBLIC_` para credenciais ou URLs de conexão PostgreSQL. A integração com Storage usa a chave privilegiada somente no servidor; não usa Supabase Auth. A autenticação do aplicativo continua sendo Better Auth.

Para preparar apenas valores de autenticação ausentes no ambiente normal, sem imprimir o segredo:

```sh
npm run auth:configure
```

## Configurar PostgreSQL / Supabase

1. Crie ou selecione um projeto Supabase dedicado ao Mystra. Use as strings reais oferecidas em **Connect**, com a senha real do banco; não use a chave da API no lugar da senha PostgreSQL. Codifique caracteres especiais de usuário/senha com percent-encoding.
2. Escolha a modalidade de conexão conforme a rede:

| Modalidade | Porta usual | Rede / uso |
| --- | --- | --- |
| Direct connection | 5432 | Normalmente IPv6; indicada para migrations e processos persistentes com rede compatível |
| Shared pooler / session | 5432 | Alternativa IPv4; aceita continuidade de sessão, útil para CLI e desenvolvimento local |
| Shared pooler / transaction | 6543 | Alternativa IPv4 para execução com pooling; não usar para migrations ou shadow database |

3. Defina `DATABASE_URL` com a conexão de execução. Para este servidor Next persistente, session pooler é uma escolha simples; transaction pooler também é suportado pelo driver sem nomes de prepared statements configurados. Preserve os parâmetros recomendados pelo painel/documentação para a URL escolhida.
4. Defina `DIRECT_URL` com direct, se houver conectividade IPv6, ou session pooler IPv4 na porta 5432. O `prisma.config.ts` lê essa variável para a CLI; não faz fallback silencioso para o transaction pooler.
5. Use TLS com validação de certificado. Copie as configurações e o certificado da documentação/painel do seu projeto. Quando necessário, use `sslmode=verify-full` e uma CA confiável (`sslrootcert` ou configuração de CA do Node). Não desative a validação para contornar erros de rede ou certificado.
6. Verifique a conexão sem gravar dados:

```sh
npm run db:check
npm run db:validate
npm run db:generate
```

O cliente Prisma 7 usa `@prisma/adapter-pg` e `pg`, com pool máximo de cinco conexões por processo, timeout de conexão de cinco segundos e singleton reutilizado no desenvolvimento. Não usa os parâmetros de pool do antigo motor Prisma como substituto das opções do driver.

### Aplicar a migration preparada

A migration está em `prisma/migrations/20261105000000_postgresql_cms/migration.sql`; o lock declara PostgreSQL. Não havia migrations MySQL para converter. Ela cria as estruturas de autenticação preservadas e o CMS, sem seed ou INSERT comercial.

Para um banco dedicado ainda sem essas tabelas:

```sh
npm run db:deploy
```

`migrate deploy` aplica a migration versionada sem exigir shadow database. Revise o SQL antes de aplicar em um banco existente. Se já houver tabelas ou histórico incompatível, investigue o estado e planeje baseline/migração de dados; não execute reset nem declare migrations aplicadas sem conferir a estrutura.

Para mudanças futuras em desenvolvimento:

```sh
npm run db:migrate -- --name nome_da_mudanca
```

Nesse caso configure `SHADOW_DATABASE_URL` para **outro banco dedicado**, acessível por direct/session, com os privilégios necessários. Nunca use o banco principal como shadow. Não use `db push` ou reset como atalho em bases com dados.

### RLS e acesso ao banco

A migration habilita Row Level Security em todas as tabelas do aplicativo e não cria políticas de acesso anônimo. Assim, a Data API do Supabase não libera usuários, sessões ou rascunhos diretamente. O acesso passa pelo servidor Next e pelas permissões Better Auth.

A conta PostgreSQL usada pelo servidor deve ser proprietária das tabelas ou ter privilégios adequados para operar com RLS, conforme o modelo de conta de servidor escolhido. A conta do painel PostgreSQL é exclusivamente de servidor. Não conceda acesso anônimo às tabelas de autenticação e não crie políticas públicas para contornar uma configuração incorreta. Separe contas de migrations/runtime em um ambiente de produção e revise seus privilégios.

## Primeiro administrador e permissões

Depois das migrations, execute em terminal interativo. PowerShell:

```powershell
$env:BOOTSTRAP_ADMIN = "true"
try { npm run admin:init } finally { Remove-Item Env:BOOTSTRAP_ADMIN }
```

Bash:

```sh
BOOTSTRAP_ADMIN=true npm run admin:init
```

O comando pede nome, e-mail e senha confirmada de 12–128 caracteres, com entrada oculta. Exige autorização temporária e banco sem usuários. Cria de forma transacional o primeiro administrador, os perfis e permissões técnicos e um log. Um marcador único impede inicializações concorrentes. Não cria credenciais fixas ou conteúdo comercial. Não serve para elevar usuários existentes.

| Perfil | Permissões iniciais |
| --- | --- |
| ADMIN | Todas as operações |
| EDITOR | content:manage: serviços, projetos, artigos, categorias, tags, tecnologias e mídias |
| COMERCIAL | requests:manage: reservado às solicitações futuras; sem alteração editorial |

O login usa hash scrypt, sessões persistidas de oito horas, cookies HttpOnly (Secure em HTTPS), proteção de origem/CSRF da biblioteca e rate limit persistente. Cadastro público permanece desabilitado. Todas as mutações verificam usuário ativo, sessão e permissão no servidor. Uploads também conferem a origem da requisição; Server Actions usam a verificação de origem do Next.

Sem configuração ou com banco indisponível, o acesso não é liberado. Recuperação de senha e CRUD de usuários continuam fora do escopo. O logout real revoga a sessão.

## Configurar Supabase Storage

1. No projeto Supabase, crie um bucket **privado** e informe o nome real em `SUPABASE_STORAGE_BUCKET`.
2. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no servidor. Não compartilhe a chave no frontend ou em repositórios.
3. Configure o bucket para aceitar `image/webp`. O servidor aceita entrada JPEG, PNG ou WebP estática e grava somente WebP normalizada. O limite de upload do bucket deve comportar os arquivos normalizados; o limite de entrada do app é 8 MB.
4. Não crie políticas de upload público e não torne o bucket público. O endpoint recusa uploads para bucket público.
5. Entre no painel e abra `/admin/midias` para enviar a imagem e preencher nome e descrição alternativa.

O servidor valida tamanho real do corpo (inclusive sem Content-Length), MIME, assinatura/decodificação, limites de pixels e imagem estática. Sharp reconverte a imagem, aplica orientação, remove os metadados e limita as dimensões a 2560 × 2560. SVG e animações são recusados. O nome do objeto é um UUID gerado no servidor.

Os metadados ficam no PostgreSQL. Se o registro falhar após o upload, o servidor tenta remover o objeto como compensação; se o Storage também falhar, o caminho órfão é registrado no log do servidor para limpeza operacional. Isso não é uma transação distribuída entre Postgres e Storage.

As imagens são servidas por `/api/media/[id]`, com consulta de referências e `Cache-Control: private, no-store`. Um visitante só acessa imagens vinculadas a conteúdo publicado; editores autenticados também acessam as demais. URLs públicas permanentes e URLs assinadas não são expostas. A despublicação retira a autorização pública nas próximas requisições.

A exclusão exige confirmação e bloqueia **qualquer referência**, inclusive rascunhos. Bloqueios de linha e chaves estrangeiras protegem contra associação concorrente durante a remoção. Falhas parciais deixam a mídia em estado DELETING, indisponível para novas seleções, com ação para retomar a exclusão.

## Usar o CMS

1. Em `/admin/categorias`, cadastre categorias por módulo, tags de artigos e tecnologias.
2. Em `/admin/midias`, envie as imagens reais que deseja usar.
3. Abra `/admin/servicos`, `/admin/portfolio` ou `/admin/blog` e escolha **Novo**.
4. Preencha título/nome, slug único no módulo, resumo e campos específicos. Selecione capa, autor do artigo, marcadores e galeria quando aplicável.
5. Salve o rascunho; a prévia administrativa só pode ser acessada por usuário com permissão editorial.
6. Para publicar, selecione Publicado e salve. Artigos exigem texto; serviços/projetos exigem descrição completa. O conteúdo passa a aparecer na listagem pública e no detalhe pelo slug.
7. Edite ou despublique pela tabela. A despublicação retira o conteúdo do portal. Exclusão exige confirmação do título; arquivos da biblioteca são preservados.

As listagens têm busca, categoria, status no painel, paginação e ordenação. O dashboard mostra totais e publicados por módulo, rascunhos e últimos conteúdos editados, sempre consultados do banco. Zero é um valor real quando a base está vazia.

O blog oferece Tiptap com H2/H3, parágrafos, negrito, itálico, listas, links, citações, imagens da biblioteca, separadores e prévia. O documento é armazenado como JSON estruturado, com validação de tipos, hierarquia, profundidade, tamanho, links e referências de mídia. O portal usa React para renderizar somente os nós permitidos; não usa `dangerouslySetInnerHTML`. Texto é escapado, imagens remotas e URLs de script são recusadas.

Cada conteúdo tem controle otimista de versão: uma edição desatualizada não sobrescreve silenciosamente outra. As operações de conteúdo e seus logs são transacionais. Consultas públicas sempre exigem PUBLISHED e data de publicação válida. A Home exibe os conteúdos publicados marcados como destaque. Metadados SEO e relacionados do blog usam a mesma restrição de publicação.

As leituras públicas são feitas por requisição, atrás de Suspense/connection para preservar Cache Components. As mutações invalidam o layout raiz, cobrindo Home, listas, detalhes, alterações de slug e relacionados. Essa invalidação ampla favorece consistência nesta etapa e pode ser refinada com tags quando houver mais volume.

## Rotas

Públicas: `/`, `/sobre`, `/servicos`, `/servicos/[slug]`, `/portfolio`, `/portfolio/[slug]`, `/academia`, `/blog`, `/blog/[slug]`, `/contato`.

Painel: `/admin/login`, `/admin`, `/admin/servicos`, `/admin/portfolio`, `/admin/blog`, `/admin/midias`, `/admin/categorias`.

Para cada módulo editorial: `/admin/{modulo}/novo`, `/admin/{modulo}/{id}/editar`, `/admin/{modulo}/{id}/preview`.

Rotas preservadas para etapas futuras: `/admin/cursos`, `/admin/documentos`, `/admin/usuarios`, `/admin/configuracoes`. Academia permanece institucional. Contato e orçamento possuem integração comercial descrita na seção Contato, orçamento e CRM.

APIs: `/api/auth/[...all]` (Better Auth), `POST /api/media` (upload autorizado), `GET /api/media/[id]` (entrega autorizada). O recebimento comercial usa POST /api/leads; as alterações administrativas são Server Actions reais.

## Modelagem e arquitetura

Modelos de autenticação preservados: User, Session, Account, Verification, Role, Permission, UserRole, RolePermission, AdminLog, InstitutionalSetting e RateLimit.

Novos modelos: **Content**, **Category**, **Tag**, **Technology**, **Media** e **ContentMedia**, além das relações muitos-para-muitos. Content usa um discriminador SERVICE/PROJECT/ARTICLE para compartilhar a estrutura de publicação, SEO, autoria, versionamento e mídia sem duplicar CRUD. Campos e validações específicos de cada tipo são aplicados no servidor. Slugs são únicos por tipo; categorias também pertencem a um tipo. ContentMedia distingue galeria de referências inline.

- `features/cms`: validação, editor, formulários, listagens, consultas, publicação, preview e renderização segura.
- `features/media`: validação binária, interface, metadados e exclusão segura.
- `features/taxonomy`: gerenciamento de categorias, tags e tecnologias.
- `lib`: autenticação preservada, autorização, adaptador PostgreSQL e cliente de Storage exclusivo do servidor.
- `components/ui` e `components/layout`: design system original reutilizado.
- `app`: layouts separados por route groups, páginas e handlers.
- `prisma`: schema, configuração externa e migration versionada sem dados.

## Testes e verificações

### Portfólio editorial

O portfólio usa as rotas existentes `/portfolio`, `/portfolio/[slug]` e `/admin/portfolio`. Destaques são definidos pelo campo Destaque na Home e consultados tanto no portfólio quanto na seção de conteúdo em destaque já existente na Home. As consultas públicas exigem publicação válida; não há projetos inseridos automaticamente.

No formulário de projeto, cadastre contexto e processo criativo somente quando houver informações para apresentar. Marque Projeto conceitual ou demonstrativo quando aplicável e identifique resultados demonstrativos na opção correspondente. A galeria permite seleção, upload real quando o Storage estiver configurado, legendas, reordenação e remoção de associações sem apagar os arquivos.

Sem alterar o schema, Content.body armazena o formato versionado `mystra.project.v1` com contexto, documento rico do processo, identificação conceitual, natureza dos resultados, legendas e marcador de arquivo. Documentos ricos legados continuam aceitos. Arquivar força DRAFT e retira a publicação; restaurar mantém rascunho e exige uma nova publicação explícita. O filtro administrativo Não publicados inclui rascunhos e arquivos, enquanto Arquivado seleciona apenas o marcador de arquivo. Não foi criado um novo valor no enum PostgreSQL.

Veja os arquivos, decisões e limites de homologação em [RELATORIO-PORTFOLIO.md](RELATORIO-PORTFOLIO.md). O CRUD autenticado e os uploads ainda precisam de teste real após configurar o segredo de autenticação, o administrador e o Storage.

```sh
npm run lint
npm run typecheck
npm test
npm run db:validate
npm run db:generate
npm run build
npm audit --omit=dev
```

Os testes isolados verificam permissões, validação editorial, publicação obrigatória nos filtros públicos, XSS/links/imagens no documento rico, unicidade sintática do slug, limites do documento, decodificação/reconversão de imagens e limite de corpo de upload. Não gravam conteúdo no banco da aplicação.

O teste de integração PostgreSQL é ignorado quando `TEST_DATABASE_URL` está vazia. Para executá-lo, configure um **banco exclusivo de testes**, com permissão para criar/remover schemas. Ele recusa a mesma origem/banco da URL de runtime, cria um schema temporário com nome gerado e validado, aplica o SQL e verifica persistência, slugs únicos, publicação/despublicação, versionamento e restrição de exclusão de mídia. Os registros sintéticos existem somente nesse schema, removido no final. Não usa Supabase Storage nem comprova o fluxo autenticado do navegador.

Após configurar um projeto real, valide manualmente: login correto/incorreto, rate limit, logout, acesso com EDITOR/COMERCIAL, criação/publicação/edição/despublicação dos três módulos, preview privado, upload, imagens de rascunhos inacessíveis anonimamente e remoção de mídia em uso recusada. A revisão visual em navegador também permanece necessária.

## Pendências e próximas etapas

- Inicializar o administrador e concluir autenticação/Storage. A migration inicial já está aplicada neste ambiente; confirme o status antes de aplicar migrations em outro banco.
- Executar testes integrados PostgreSQL e homologação de autenticação/Storage no Supabase real.
- Revisar o painel autenticado em navegadores mobile/desktop.
- Evoluir usuários/permissões pela interface, cursos, documentos, eventos e solicitações, sem simulações.
- Acompanhar os alertas da árvore de desenvolvimento do lint; não aplicar downgrade major automático do Next para corrigi-los.

Não houve deploy. O relatório detalhado da execução está em `RELATORIO-ETAPA-2.md`; o relatório da Etapa 1 é histórico.

Referências consultadas: guias da versão instalada em `node_modules/next/dist/docs`, [Prisma 7/PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql), [conexões Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Tiptap React](https://tiptap.dev/docs/editor/getting-started/install/react) e [Better Auth/Next](https://better-auth.com/docs/integrations/next).
## Mystra Insights

O Insights usa `/blog` e `/blog/[slug]`, integrado ao CRUD existente de `/admin/blog`. Consulte [RELATORIO-INSIGHTS.md](RELATORIO-INSIGHTS.md) para arquivos, decisões, verificações e limites de homologação.

O editor Tiptap suporta H2–H4, listas, citações, imagens da biblioteca com legenda e texto alternativo, código com destaque, tabelas, desfazer/refazer, contagem de palavras e prévia local. Salvar rascunho e publicar continuam sendo operações explícitas no servidor. Há aviso para alterações não salvas ao fechar/recarregar ou seguir links; não há autosave nem agendamento.

Artigos arquivados são DRAFT com marcador validado em `Content.body.attrs.archived`; restaurar não publica automaticamente. Descrições de categorias e tags usam InstitutionalSetting com chave `taxonomy.<tipo>.<id>`, sem migration adicional. Categorias e tags são gerenciadas em `/admin/categorias`, com contagem e links de associações.

Configure `SITE_URL` com a origem real do portal para canonical, Open Graph e URLs absolutas do JSON-LD. Sem essa configuração, a aplicação não inventa domínio. Compartilhamento por links e cópia usa o endereço real no navegador.

Nesta execução, a conexão PostgreSQL foi confirmada e a migration inicial já estava aplicada; não foram executadas migrations nem inseridos artigos. O fluxo autenticado e Storage ainda exigem configurar BETTER_AUTH_SECRET, inicializar o administrador e configurar as variáveis de Storage conforme as instruções acima. Os testes de integração requerem TEST_DATABASE_URL exclusiva. A página pública funciona com banco vazio, sem publicações demonstrativas.
## Contato, orçamento e CRM

As rotas `/contato` e `/orcamento` estão integradas a `POST /api/leads`. O orçamento tem quatro etapas e permite associar serviços publicados. A confirmação depende de commit no banco; não significa envio de e-mail ou contratação. O aviso técnico fica em `/privacidade`.

A migration `20261105010000_commercial_crm` adiciona Lead, LeadNote, LeadActivity e LeadAttachment, três enums e RLS. Ela já foi aplicada neste banco de desenvolvimento após autorização, sem reset ou remoção de dados. Em outro ambiente, revise `npx prisma migrate status` antes de qualquer aplicação. Nunca execute migrations não revisadas.

O CRM utiliza `/admin/leads` e `/admin/leads/[id]`, com permissão `requests:manage` verificada no servidor. COMERCIAL recebe a visão comercial em `/admin`; ADMIN pode acessá-la por `/admin?comercial=1`. EDITOR não tem acesso comercial automático. Não há Kanban nem exclusão definitiva pela tela de atendimento.

Configure `CRM_FORM_SECRET` com uma chave aleatória de 32+ caracteres, exclusivamente no servidor (usa BETTER_AUTH_SECRET válido se estiver vazia). Nesta execução, a chave CRM foi gerada apenas no `.env` local ignorado. Configure BETTER_AUTH_SECRET e o primeiro administrador conforme as instruções anteriores para acessar o painel. Nenhuma credencial foi incluída nos arquivos de exemplo.

Configure canais reais em `CONTACT_EMAIL`, `CONTACT_HOURS` e `CONTACT_SOCIAL_LINKS` (array JSON com label e url HTTPS). Campos vazios não são exibidos como canais disponíveis. A configuração InstitutionalSetting `contact.channels` também é aceita. Não cadastre contatos demonstrativos como se fossem canais reais.

Anexos exigem `SUPABASE_LEADS_BUCKET` privado, distinto do bucket editorial, além das variáveis de Storage existentes. Sem configuração, o campo fica desabilitado. São aceitas referências JPEG/PNG/WebP estáticas até 2 MB, reconvertidas no servidor. Não são aceitos PDF ou outros documentos nesta versão. O download exige sessão e permissão comercial, sem URL pública do objeto.

A proteção utiliza tokens assinados com validade de duas horas, honeypot, validação Zod, comparação de Origin e limites compartilhados no PostgreSQL. Mantenha BETTER_AUTH_URL igual à origem pública da aplicação, inclusive atrás do proxy. Dados pessoais ficam apenas em memória no navegador durante as etapas. Os limites atuais são 200 requisições/minuto globalmente e cinco envios/e-mail em dez minutos; avalie também proteção no ingress em produção.

O relatório de retenção é somente leitura e não exibe dados pessoais. Defina `CRM_RETENTION_REVIEW_DAYS` conforme a revisão operacional e execute `npm run crm:retention-report`. Não há exclusão automática. Defina política de retenção, canal do controlador e procedimento para titulares antes de uso comercial; arquivamento não elimina dados.

A conexão e a migration foram verificadas; o fluxo positivo de envio/CRM autenticado/Storage não foi homologado. Configure um banco independente em TEST_DATABASE_URL para executar a integração opcional com `npm test`. Ela cria/remove somente um schema temporário no banco de testes, nunca no banco da aplicação. Veja decisões, arquivos, resultados e pendências em [RELATORIO-CRM.md](RELATORIO-CRM.md).
## Eventos & Workshops

O portal usa `/eventos` e `/eventos/[slug]`, com catálogo, filtros, calendário e inscrições gratuitas. A Home mostra somente próximos eventos publicados e destacados; sem registros, não cria uma seção com programação falsa.

A administração utiliza `/admin/eventos`, `/admin/eventos/novo`, `/admin/eventos/[id]/editar`, `/admin/eventos/[id]/preview`, `/admin/eventos/[id]/inscricoes`, `/admin/eventos/categorias` e `/admin/eventos/palestrantes`. Todas as consultas e ações administrativas exigem sessão e `content:manage`; COMERCIAL não recebe acesso aos participantes automaticamente. Preview é privado e não indexável.

A migration `20261105020000_events_workshops` já foi aplicada no banco de desenvolvimento após autorização. Ela acrescenta oito tabelas, três enums, índices, relacionamentos, restrições e RLS. Antes de preparar outro ambiente, execute `npx prisma migrate status` e revise o que estiver pendente; não faça reset nem reaplique SQL manualmente.

Datas de evento/programação/janela são armazenadas como instantes TIMESTAMPTZ e exibidas no fuso IANA cadastrado. O formulário aceita horário local ou ISO com offset explícito, recusa datas inválidas e ambiguidades de horário de verão. A inscrição em `POST /api/eventos/inscricoes` verifica publicação, janela, estado, capacidade e unicidade por evento/e-mail sob lock transacional do evento. RECEBIDA e CONFIRMADA ocupam vagas; CANCELADA libera. Reativação e alteração de capacidade usam o mesmo controle de concorrência. Não há pagamento, e-mail de confirmação, certificados ou lista de espera.

A proteção reutiliza a chave dos formulários existente (CRM_FORM_SECRET, com fallback para BETTER_AUTH_SECRET), com assinatura derivada específica de eventos, honeypot e limites compartilhados no PostgreSQL. Mantenha BETTER_AUTH_URL na origem real da aplicação. Os participantes não são públicos; o campo de acesso privado não integra a projeção do portal. CSV em `/api/eventos/[id]/inscricoes.csv` exige autorização, aplica filtros e limita a 10 mil registros, com proteção contra fórmulas de planilha.

Capas, galeria e fotos reutilizam a biblioteca/Storage existentes. Para uploads, configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_STORAGE_BUCKET privado, somente no servidor. Sem Storage, o upload fica indisponível. Mídias associadas a eventos ou palestrantes não podem ser apagadas enquanto houver referências. Não há associação artificial com cursos: a revisão atual ainda não possui modelos acadêmicos persistentes.

O aviso `/privacidade#eventos` descreve a finalidade da coleta e as pendências operacionais. Defina controlador, canal e política de retenção antes do uso comercial. O comando `npm run eventos:retention-report`, com EVENT_REGISTRATION_REVIEW_DAYS configurado conforme a operação, produz somente contagens para revisão, sem excluir dados ou definir prazo legal.

Depois de alterar schema e executar `npm run db:generate`, reinicie `npm run dev` para o hot reload não manter um cliente Prisma transacional anterior. O servidor deste workspace foi reiniciado durante a verificação. Não exponha segredos em mensagens ou variáveis NEXT_PUBLIC.

O ambiente continua sem autenticação administrativa completa, usuários, Storage e TEST_DATABASE_URL independente. A suíte isolada passou; o teste positivo de CRUD/inscrição/concorrência/upload não foi homologado. Veja decisões, arquivos, migrations e resultados em [RELATORIO-EVENTOS.md](RELATORIO-EVENTOS.md).
## Mystra Careers — vagas e ATS

Rotas: `/trabalhe-conosco`, `/trabalhe-conosco/[slug]`, `/admin/vagas`, `/admin/vagas/novo`, `/admin/vagas/[id]/editar`, `/admin/vagas/[id]/preview`, `/admin/candidaturas` e `/admin/candidaturas/[id]`. O dashboard privado está em `/admin?recrutamento=1`.

A migration `20261105030000_careers_ats` foi aplicada em 05/11/2026 no banco de desenvolvimento após autorização explícita, sendo a única pendente no pré-check. Acrescenta Job, JobApplication, ApplicationNote, ApplicationActivity e JobActivity; quatro enums, 17 índices além das cinco PKs, oito FKs, cinco CHECKs e RLS sem políticas públicas; cadastra `recruitment:manage` sem atribuição automática. A auditoria confirmou estruturas válidas, usuários/concessões intactos e nenhuma vaga/candidatura inserida. As quatro migrations estão aplicadas e `npx prisma migrate status` retorna banco atualizado. Em outro ambiente, revise e autorize o que estiver pendente antes de executar deploy; não faça reset.

Gestão de vagas usa `content:manage`. Candidatos, currículos, notas e métricas privadas exigem `recruitment:manage` ou ADMIN; EDITOR/COMERCIAL não recebem esse acesso por padrão. O papel RECRUTADOR não foi adicionado; a permissão foi preparada sem alterar papéis/usuários existentes. A busca de candidatos utiliza POST, sem nomes/e-mails nas URLs.

`CAREERS_MODE=demo` é o padrão, inclusive quando ausente/desconhecido. Nesse modo, não há upload/envio na interface e `POST /api/careers/applications` recusa antes de ler o corpo ou gravar dados. Os exemplos são sintéticos e somente leitura. Não envie currículos ou dados reais para este projeto fictício.

Para testes controlados: prepare um banco independente em TEST_DATABASE_URL, aplique apenas migrations previamente revisadas/autorizadas e execute `npm run careers:prepare-test` com CAREERS_PREPARE_TEST=true enquanto DATABASE_URL/DIRECT_URL ainda identificam o banco principal (o script recusa que o alvo seja esse banco). Ele grava somente o marcador `careers.controlled-test` no banco de testes. Depois inicie uma instância isolada com conexões, autenticação e Storage de teste, CAREERS_MODE=test, CAREERS_CONTROLLED_TEST=true e CAREERS_RETENTION_DAYS definido. O modo test não funciona em NODE_ENV=production. Operadores precisam de sessão/permissão de recrutamento, nomes iniciados por Teste, e-mails @example.test e PDF sintético autorizado em `/api/careers/synthetic-resume`.

Recebimento real exige uma decisão explícita: CAREERS_MODE=live, CAREERS_PRIVACY_REVIEWED=true, CAREERS_SECURITY_REVIEWED=true, controlador/canal e retenção configurados, além de DB, autenticação operacional e Storage privado. Essas flags não substituem revisão jurídica ou de segurança. Revise a finalidade e os textos de empresa fictícia antes de qualquer uso real; o projeto deve continuar em demo até isso ocorrer.

Currículos exigem SUPABASE_CAREERS_BUCKET privado e separado dos buckets de mídia/comercial, sem políticas públicas de leitura/listagem/upload. Use SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY somente no servidor. Limite padrão de PDF: 5 MB, configurável de 1 a 10 em CAREERS_MAX_CV_MB. O parser roda em worker com limites de recurso e recusa conteúdo ativo conhecido; não é um antivírus. Downloads passam por autorização, sem expor caminhos de Storage ou renderizar PDFs na página.

O aviso técnico está em `/privacidade#careers`. Cada candidatura registra o prazo de revisão de retenção configurado no recebimento. `npm run careers:retention-report` somente conta registros para revisão; não exclui. A exclusão definitiva na tela exige ADMIN, login recente, revisão explícita e confirmação do identificador; pode ficar pendente se Storage/DB falharem. Backups e outras cópias exigem procedimento separado.

Nesta execução: Supabase conectado; zero buckets/políticas de objetos; autenticação, administrador, Storage e TEST_DATABASE_URL ausentes. Testes isolados, responsividade e bloqueio demonstrativo passaram; CRUD/candidaturas/arquivos/expurgo não foram homologados de ponta a ponta. Cliente Prisma regenerado e dev reiniciado. Veja [RELATORIO-CAREERS.md](RELATORIO-CAREERS.md) para arquivos, decisões, resultados e pendências.

## CMS institucional e administração avançada

Consulte [RELATORIO-CMS-INSTITUCIONAL.md](RELATORIO-CMS-INSTITUCIONAL.md) para arquitetura, arquivos, testes e limites de homologação.

O painel possui `/admin/paginas`, `/admin/paginas/home/editar`, `/admin/paginas/sobre/editar`, prévias em `/admin/paginas/[id]/preview`, `/admin/equipe`, `/admin/parceiros`, `/admin/faq`, `/admin/configuracoes` e `/admin/configuracoes/preview`. Administração de acesso utiliza `/admin/usuarios`, `/admin/permissoes` e `/admin/logs`.

Não há migration nova nesta etapa. A persistência reutiliza InstitutionalSetting e AdminLog; as quatro migrations existentes continuam aplicadas. Não execute reset ou migrações adicionais para habilitar este editor. As chaves `institutional.v1.*` são reservadas ao CMS validado. Defaults da Home, Sobre, configuração estrutural e FAQ de Contato não são inseridos automaticamente. Equipe e parceiros começam vazios.

Preparação local:

1. Instale com `npm install`; confira o `.env` local ignorado, DATABASE_URL para execução e DIRECT_URL para Prisma CLI.
2. Configure BETTER_AUTH_URL com a origem local correta e BETTER_AUTH_SECRET aleatório de pelo menos 32 caracteres, somente no servidor. Não compartilhe o segredo em mensagens ou arquivos públicos.
3. Execute `npm run db:generate`, `npm run db:validate` e `npx prisma migrate status`. Não aplique alterações de banco não revisadas/autorizadas.
4. Se ainda não houver usuários, inicialize o primeiro ADMIN em terminal interativo com `BOOTSTRAP_ADMIN=true` e `npm run admin:init`; remova a autorização temporária ao terminar. O script pede senha oculta, não aceita elevar contas existentes e não cria credenciais fixas.
5. Inicie `npm run dev`, entre no painel e abra Páginas. Os templates são os layouts atuais, com campos estruturados. Salve um rascunho, abra a prévia protegida e publique. O portal mantém a última publicação enquanto você prepara outra revisão.
6. Para imagens, configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_STORAGE_BUCKET privado, com as políticas já documentadas. Sem Storage, não há upload simulado; textos podem ser gerenciados sem imagens.

O Hero permanece único e visível no início. Reordenação usa botões acessíveis. Seções complementares podem ser duplicadas; templates originais podem ser removidos e adicionados novamente entre os componentes permitidos. Até dez publicações são preservadas; restauração cria rascunho e não altera o portal imediatamente. Alterações concorrentes exigem recarregar em vez de sobrescrever silenciosamente. Não há autosave.

Equipe e parceiros só aparecem quando seus registros e a seção correspondente da Home/Sobre estiverem publicados. Equipe mantém identificação conceitual; parceiros exigem declaração de autorização. FAQ central permite categorias textuais e associação de páginas: Contato, Soluções, Eventos e a rota atual da Academy usam os registros publicados; Home/Sobre recebem uma seção FAQ pelo editor. As perguntas anteriores de Contato são defaults editáveis, ainda sem registros automáticos.

Configurações são divididas em informações gerais, identidade, redes sociais, SEO, comunicação, navegação e rodapé. Desktop/mobile usam o mesmo menu. O aviso de empresa fictícia e links essenciais são preservados. Canais publicados substituem os fallbacks antigos de contato. E-mails de exibição não habilitam envio. Defina SITE_URL válida para canonical/Open Graph; previews/administração continuam não indexáveis. O favicon padrão segue em `/icon.svg`, agora servido de public para permitir substituição pelos metadados do CMS.

Permissões: ADMIN mantém acesso integral. content:manage preserva o CMS legado, edição de rascunhos institucionais e coleções; publicar páginas exige pages:publish. pages:read e pages:update permitem concessões específicas. institutional:manage, settings:manage, users:manage e audit:read controlam os demais módulos. CRM e candidaturas continuam exigindo suas permissões privadas. Somente ADMIN pode alterar perfis/concessões; nada é atribuído automaticamente. A tela de permissões afeta todos os usuários do perfil e revoga as sessões afetadas. Alterações de acesso exigem login recente de até dez minutos e protegem a própria conta e o último administrador recuperável. Convites aguardam infraestrutura real de e-mail.

As imagens selecionadas ficam protegidas contra exclusão enquanto houver rascunho, publicação ou versão retida que as referencie. O CMS não duplica arquivos. A consulta institucional pública seleciona somente o snapshot publicado, usa cache compartilhado com revalidação em cinco minutos/expiração em uma hora e memoização por requisição. As mutações invalidam imediatamente sua tag com updateTag e revalidam o layout público. Os metadados globais usam a mesma fonte cacheada.

Verificações: `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. O teste institucional PostgreSQL adicional usa TEST_DATABASE_URL independente e cria/remove apenas um schema temporário validado nesse banco; sem a variável, é ignorado. Não aponte TEST_DATABASE_URL para o banco da aplicação, inclusive usando outra modalidade de conexão do mesmo projeto Supabase.

Estado desta entrega: conexão Supabase confirmada, nenhuma migration pendente, 44 testes aprovados e cinco integrações ignoradas. Faltam autenticação, primeiro usuário, Storage e banco de testes independente para homologação positiva de CRUD/publicação/acessos/uploads. Academy e Documentos ainda possuem lacunas anteriores; esta camada não apresenta essas integrações como concluídas. Não foram inseridos dados comerciais, alterados segredos ou executado deploy.


## Etapa 11 — auditoria e operação segura

Referência atual: [AUDITORIA-GERAL.md](AUDITORIA-GERAL.md). Foram registrados 26 problemas/pendências, com 16 corrigidos e dez pendentes; a falha crítica foi corrigida após autorização. Resultado final: 57 testes aprovados, cinco integrações ignoradas; lint, TypeScript, build, Prisma e npm audit aprovados. Mocks não homologam CRUD, sessão ou Storage reais.

O Supabase está conectado: quatro migrations aplicadas, nenhuma pendente, 37 tabelas públicas com RLS. O SQL manual autorizado em security/proposals/20261106_prisma_migrations_privileges.sql revogou privilégios públicos da tabela técnica de migrations e habilitou RLS, sem alterar dados. Não reaplique em outro destino sem revisão/autorização.

### Configuração local e autenticação

.env continua local e ignorado; apenas .env.example pode ser versionado. Nunca compartilhe URLs/chaves em mensagens ou código cliente. DATABASE_URL é a conexão de execução, DIRECT_URL é usada pela CLI Prisma. Reinicie o servidor após mudar ambiente/schema para reconstruir inclusive a instância de autenticação.

Configure BETTER_AUTH_SECRET aleatório de pelo menos 32 caracteres, sem placeholders, e BETTER_AUTH_URL com a origem exata. Produção exige HTTPS e cookies Secure. npm start sobre HTTP local permite inspeção pública, mas não habilita autenticação de produção; para login local use npm run dev com origem HTTP local correta ou HTTPS apropriado.

Depois de confirmar a configuração/migrations, crie o primeiro ADMIN pelo procedimento interativo: habilite BOOTSTRAP_ADMIN=true temporariamente e execute npm run admin:init em terminal interativo; remova a autorização depois. Não há senha fixa, bootstrap automático ou elevação de conta existente. Recuperação de senha e convites por e-mail não estão implementados.

Storage continua ausente. Configure as variáveis SUPABASE_* do exemplo somente no servidor, buckets privados separados para biblioteca, comercial e currículos e políticas revisadas. Não exponha chaves privilegiadas via NEXT_PUBLIC nem crie acesso público para contornar autorização. Careers permanece demo, sem currículos verdadeiros.

### Verificações e isolamento de testes

```sh
npm run lint
npm run typecheck
npx tsc --noEmit
npm test
npm run build
npx prisma validate
npx prisma migrate status
npm audit
```

Esses comandos não aplicam migrations. Prisma CLI pode mostrar o host: sanitize a saída antes de compartilhar. Não use reset/db push para resolver divergências.

As cinco integrações opcionais exigem TEST_DATABASE_URL em um PostgreSQL **independente** e TEST_DATABASE_ISOLATED=true após conferir o destino. Não use o banco principal por outra porta, usuário, pooler/direct ou schema. A guarda compara DATABASE_URL e DIRECT_URL, inclusive referências Supabase, e rejeita options/schema na URL de testes. As suítes criam/removem apenas schemas temporários validados no banco isolado e configuram search_path por conexão.

A flag declara uma verificação operacional: não descobre infalivelmente todo alias de rede. Confira destino/permissões antes de executar. Um CI com banco dedicado pode usar somente conexão de testes e confirmação; não forneça segredos do principal apenas para satisfazer a guarda. careers:prepare-test também usa essa proteção e exige CAREERS_PREPARE_TEST=true; grava seu marcador somente no banco isolado.

### Auditoria de navegador reproduzível

Com a aplicação local iniciada:

```sh
npm run audit:browser
```

Padrão http://localhost:3000; AUDIT_BASE_URL aceita outra porta local, como http://localhost:3111 para next start. Chrome local é necessário: AUDIT_CHROME_PATH permite escolher o executável ou AUDIT_CDP_URL usa um CDP local existente. Alvos externos são recusados. O script abre alvo próprio, bloqueia todos os pedidos diferentes de GET/HEAD e não testa submissões positivas.

São 12 páginas desktop/mobile com axe-core 4.14.0, layouts compactos/tablet, texto da Home em 200%, Escape do menu e validação vazia de contato. Relatório em .next/cache/audit11/browser.json, com temporários no diretório ignorado. Não certifica WCAG nem substitui leitor de tela, teclado completo e revisão autenticada.

### SEO e indexação

Indexação desabilitada por padrão. Um domínio real aprovado exige SITE_URL como origem HTTPS sem credenciais, SITE_INDEXING_ENABLED=true em produção e autorização no SEO institucional publicado. Administração/API/previews continuam noindex; não habilite indexação de staging.

robots.txt bloqueia tudo e sitemap.xml fica vazio sem aprovação. Quando habilitado, sitemap consulta somente publicações; Careers individual depende de modo live operacional. Academy/Downloads não implementados não são anunciados. Mutações invalidam a tag compartilhada. Particione o sitemap antes de ultrapassar seus limites de entradas.

### Bloqueios restantes

Autenticação/primeiro ADMIN, Storage e banco de testes independente precisam de configuração e homologação real de CRUDs, sessões, publicação e arquivos. Academy e Documentos requerem implementação própria; o CRM ainda não tem exportação CSV comercial. Algumas buscas pessoais administrativas usam query string, apesar da mitigação no-referrer/no-store; migrar para POST/estado transitório e revisar logs antes de coletar dados reais.

Defina controlador, canal de privacidade, retenção e reconciliação de arquivos/RateLimit. Relatórios de retenção são somente leitura, sem garantia de conformidade jurídica. Não houve coleta real, exclusão em massa, criação de buckets/políticas ou deploy nesta auditoria.

## Etapa 12A — primeiro acesso administrativo

Atualização de 06/11/2026: o segredo ausente já foi gerado e salvo exclusivamente no .env local, sem exibição. DATABASE_URL, DIRECT_URL, origem e demais valores foram preservados. A conta ADMIN **não foi criada automaticamente**. Esta seção atualiza o estado de autenticação dos relatos anteriores.

Variáveis necessárias:

| Variável | Uso | Estado local verificado |
| --- | --- | --- |
| DATABASE_URL | Prisma na aplicação e no bootstrap | Configurada; conexão confirmada |
| DIRECT_URL | Prisma CLI/migrations | Configurada; migrations existentes aplicadas |
| BETTER_AUTH_SECRET | Assinatura/segurança do Better Auth | Configurada localmente, sem revelar valor |
| BETTER_AUTH_URL | Origem exata de autenticação | Origem localhost na porta 3000 validada |
| BOOTSTRAP_ADMIN | Autorização temporária do comando inicial | Não persistir no .env; habilitar só no terminal do bootstrap |

Para preparar outro checkout local sem imprimir segredo:

```powershell
npm run auth:configure
```

Esse comando usa crypto.randomBytes(48), grava somente campos ausentes no .env existente e preserva segredos válidos. Não rotaciona credenciais, não copia URLs, não acessa o banco e não cria usuário. Se houver segredo inválido, duplicatas ou arquivos de ambiente com maior prioridade, exige revisão manual. Para mudar a porta, edite somente BETTER_AUTH_URL local e use exatamente a mesma origem no navegador. Não misture localhost e 127.0.0.1 durante o login. Reinicie o servidor após mudanças.

Crie sua conta no terminal PowerShell interativo do VS Code, na raiz do projeto:

```powershell
$env:BOOTSTRAP_ADMIN = "true"
try {
  npm run admin:init
} finally {
  Remove-Item Env:BOOTSTRAP_ADMIN -ErrorAction SilentlyContinue
}
```

O comando solicita nome, e-mail, senha de 12–128 caracteres e confirmação. As duas entradas de senha ficam ocultas. Use dados da conta que você autoriza; não envie senha ou segredo pelo chat. Não use redirecionamento, pipe, execução automatizada ou terminal sem TTY. O cadastro é atômico, usa hash do Better Auth e atribui ADMIN; se existir qualquer usuário ou a inicialização já tiver ocorrido, será recusado. Não apague registros/marcadores para tentar repetir.

Depois:

```powershell
npm run dev
```

Acesse http://localhost:3000/admin/login e entre com as credenciais que você acabou de definir. O dashboard fica em /admin e Sair da conta encerra a sessão. O servidor local iniciado nesta etapa pode ser reutilizado; não abra outra instância na mesma porta.

HTTP localhost é para desenvolvimento. npm start executa em produção, cuja configuração exige origem HTTPS e cookies Secure; esse controle foi preservado. Não reduza a proteção para usar login de produção sobre HTTP.

Homologação manual após criar a conta:

1. Entrar e acessar /admin; atualizar a página e confirmar manutenção da sessão.
2. Sair da conta; tentar abrir /admin em aba sem sessão e confirmar redirecionamento.
3. Tentar a mesma conta com senha incorreta e confirmar recusa sem sessão.
4. Entrar novamente e conferir acesso administrativo aos módulos e páginas protegidas.
5. Não alterar usuários/permissões apenas para testar; fluxos com escrita de teste devem usar ambiente independente.

Nesta etapa passaram lint, TypeScript, build, 61 testes automatizados (cinco integrações ignoradas) e sete verificações HTTP de configuração/recusa. Credenciais inexistentes retornaram 401, mas login positivo, logout autenticado e persistência real de sessão aguardam sua criação interativa da conta. Não houve usuário de teste, migration, reset ou deploy.

Arquivos e detalhes em [AUDITORIA-GERAL.md](AUDITORIA-GERAL.md), seção Etapa 12A. Nenhuma nova dependência ou provedor de autenticação adicionado.


### Acesso confirmado — 07/11/2026

A primeira conta ADMIN foi criada pela proprietária, que confirmou login e dashboard aberto em http://localhost:3000/admin/login. A verificação somente leitura confirmou vínculo ADMIN, conta credential correta, sessão válida e logs de bootstrap/login, sem consultar ou expor credenciais. Não repita o bootstrap: ele agora deve recusar nova inicialização. Use a conta criada; mantenha BOOTSTRAP_ADMIN desabilitado.

CFG-01 resolvido. A proprietária confirmou manutenção da sessão ao atualizar, logout com retorno ao login e proteção posterior de /admin. Consulta somente leitura confirmou zero sessões após sair, mantendo a conta ADMIN. Esta é uma homologação manual com evidência de banco, sem exposição de senha/token; não substitui testes dos demais módulos. Não foi aguardada a expiração natural de oito horas nem testada senha incorreta da conta real. Esta atualização supera as instruções históricas que indicavam ausência de conta.


## Redesign do Mystra Admin — 07/11/2026

O painel recebeu navegação em cinco grupos, ícones próprios, sidebar compacta, conta no rodapé, drawer mobile, breadcrumbs e busca por módulos/atalhos com Ctrl+K/Cmd+K. O dashboard agora separa as visões Geral, Eventos, Institucional, Comercial e Recrutamento, com dados reais e as permissões existentes.

Tabelas, filtros, formulários, diálogos e estados seguem tokens exclusivos do admin. Os avisos de alterações não salvas do CMS também cobrem serviços e portfólio. As preferências locais em mystra.admin.ui.v1 guardam apenas estado de interface, sem dados pessoais ou autorização. Nenhum bootstrap, migration ou configuração de banco é necessário para usar o novo visual.

Abra http://localhost:3000/admin com npm run dev ativo e sua conta existente. Cursos e Documentos permanecem identificados como indisponíveis. Não foram implementados novos módulos de negócio.

Detalhes, arquivos, testes, limites e screenshots em [REDESIGN-ADMIN.md](REDESIGN-ADMIN.md). A validação visual automatizada utiliza componentes isolados, sem sessão ou banco; não equivale a E2E autenticado. Para reproduzir, execute npm run build, depois npm run preview:admin-ui e, em outro terminal, npm run audit:admin-ui. Requer Chrome local; opcionalmente configure AUDIT_CHROME_PATH. A porta 3112 serve somente a prévia de componentes, sem operações de negócio; o painel real continua na porta 3000.

Em 07/11/2026, a proprietária confirmou a atualização do dashboard autenticado, o recolhimento/expansão da sidebar e a navegação com Ctrl+K no navegador habitual. A revisão manual desses controles foi concluída; os demais limites de homologação estão descritos no relatório.
