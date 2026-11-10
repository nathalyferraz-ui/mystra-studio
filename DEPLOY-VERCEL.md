# Publicar a primeira versão na Vercel

Preparação de 09/11/2026. **Nenhum deploy foi executado.** A versão usa o projeto Supabase principal e o ADMIN existente. Segundo banco, conta demo e papel PostgreSQL especial estão fora desta publicação.

## Sequência curta

1. Revisar o conteúdo e testar rascunho → publicação → edição → despublicação pela conta da proprietária, usando conteúdo autoral que de fato deva existir. Não gerar fixtures ou seed no principal.
2. Criar/conectar o repositório GitHub somente após conferir arquivos ignorados e ausência de segredos no índice/histórico.
3. Definir a origem pública canônica da Vercel e cadastrar variáveis **apenas em Production**.
4. Conferir configuração, TLS e build; autorizar a publicação separadamente.
5. Após o deploy autorizado, testar portal, login/logout, sessão, bloqueio sem sessão e edição real no domínio HTTPS. Só então liberar indexação, se desejado.

## Configuração preparada

- Next.js detectado por vercel.json; buildCommand = `npm run build:vercel`.
- Node 22.x, definido em package.json e .nvmrc, compatível com o Prisma instalado. O build foi verificado também com Node 22 localmente.
- `postinstall` e build Vercel geram Prisma; nenhum deles aplica migration, seed ou bootstrap.
- PostgreSQL via @prisma/adapter-pg/pg, singleton por processo e limite de conexões. Use pooler do Supabase apropriado para o runtime; não abra conexões por componente.
- Better Auth usa baseURL explícita, sessões persistidas, hash seguro, cadastro público desabilitado e cookies Secure em produção. Não há wildcard para origens Vercel.
- Rotas administrativas e operações mantêm validação de sessão e permissão no servidor; headers noindex/private/no-store preservados.
- Preview com o build preparado é recusado; auth e indexação também recusam Preview. Não atribua variáveis do banco principal ao escopo Preview/Development da Vercel. Não crie wildcard de confiança para *.vercel.app.

Preview não é necessário para esta primeira publicação. Desative deployments automáticos de branches/PRs se não quiser builds recusados nesse escopo. A CI de qualidade não precisa de credenciais do banco.

## Variáveis Production

| Variável | Valor/configuração necessária |
| --- | --- |
| MYSTRA_ENV | production, preservando o contexto normal; nunca demo/homologation |
| DATABASE_URL | Conexão de execução do projeto principal, com TLS verificado e pooling apropriado |
| BETTER_AUTH_SECRET | Segredo forte configurado privadamente; nunca senha ou valor de exemplo |
| BETTER_AUTH_URL | Origem HTTPS canônica exata da publicação, sem caminho/query/fragmento |
| SITE_URL | Mesma origem HTTPS canônica, para canonical/Open Graph |
| SITE_INDEXING_ENABLED | false durante a revisão; true somente após aprovação e SEO institucional publicado |
| DIRECT_URL | Opcional no servidor web; preferível manter a conexão proprietária local para verificações/migrations manuais autorizadas |
| SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_STORAGE_BUCKET | Somente se imagens forem habilitadas; opcionais para a primeira versão textual |

Não cadastrar BOOTSTRAP_ADMIN=true, TEST_DATABASE_URL, SHADOW_DATABASE_URL, valores DEMO_* ou HOMOLOG_* no deploy principal. Não executar bootstrap novamente: a conta ADMIN atual já existe no mesmo banco. Não alterar ou publicar sua senha. Não incluir variáveis NEXT_PUBLIC_ contendo segredos, URLs PostgreSQL ou chaves privilegiadas.

No painel da Vercel, instale dependências com devDependencies (npm ci padrão), pois Prisma CLI e TypeScript são necessários no build. A geração foi verificada sem URL de banco; não depende de disponibilizar DIRECT_URL ao processo web.

## TLS PostgreSQL

O preflight exige `sslmode=verify-full`; ele não comprova que a rede/certificado do servidor publicado estejam funcionando. A conexão local existente não foi alterada.

Se o Supabase exigir sua CA privada, baixe **o certificado público oficial** em Database Settings → SSL Configuration → Download Certificate e mantenha-o no projeto em prisma/certificates/supabase-root-2021.crt. Na URL cadastrada privadamente na Vercel, use sslrootcert com caminho relativo a partir da raiz de execução, por exemplo `prisma/certificates/supabase-root-2021.crt`, e inclua esse arquivo no bundle. Nunca use caminho C:/Users/... na Vercel, rejectUnauthorized=false, no-verify ou NODE_TLS_REJECT_UNAUTHORIZED=0. Certificado CA público pode ser versionado; chave privada não.

next.config.ts inclui essa pasta de certificados no rastreamento de arquivos do servidor. Se o certificado ainda não foi obtido e a cadeia não for confiável no Node, isso impede a conexão segura e deve ser resolvido antes do deploy. Não implica criar outro projeto Supabase ou mudar permissões do banco principal.

Use direct quando houver IPv6 compatível ou session pooler IPv4 5432 para CLI/migrations. Para runtime serverless, avalie transaction pooler; mantenha os parâmetros aceitos pelo driver instalado. Não use os antigos pgbouncer/connection_limit como substitutos da configuração do pool pg. O guia local preserva o principal; nenhuma string real aparece neste documento.

## Banco e migrations

Prisma validate passou e migrate status confirmou quatro migrations sincronizadas no projeto atual. Não existe mudança de schema nesta finalização. O script de build **não executa migrate deploy**. Uma migration futura deve ser revisada e autorizada, fora do ciclo de build automático, especialmente porque previews não podem modificar o banco principal.

Acesso ao banco deve continuar restrito ao servidor. RLS não substitui a autorização das Server Actions e APIs Prisma. Não alterar políticas, usuários ou permissões do Supabase como parte do deploy sem revisão específica.

## GitHub e CI

O diretório não tinha .git na preparação. Antes do primeiro push, confira `git status --short`, `git check-ignore .env .env.demo` e a lista de arquivos preparados para commit. Não publique segredos em prints, issues ou logs. O .gitignore ignora .env* e permite somente os três exemplos explicitamente vazios; mantém node_modules, builds e cliente gerado fora do índice.

O workflow .github/workflows/ci.yml executa instalação, lint, tipos, testes e build com Node 22, sem secrets de banco e sem deploy. As integrações opcionais permanecem ignoradas quando não existe destino isolado. A execução real no GitHub ainda depende da criação/conexão do repositório; não foi declarada aprovada remotamente.

Os relatórios antigos foram preservados. Revise também anexos e documentação antes de torná-los públicos; mantenha fora do Git arquivos locais contendo dados pessoais e credenciais, mesmo quando tenham nomes de exemplo/cópia.

## O que impede a publicação, de fato

1. Falta definir/configurar a origem HTTPS final e suas variáveis Production na Vercel. O `.env` atual usa localhost e foi preservado.
2. Falta validar a conexão PostgreSQL com TLS verificado no runtime publicado, incluindo CA quando necessária. O preflight local apontou ausência dessa configuração de produção.
3. Falta homologar o ciclo autenticado dos três CMS e a edição de Home/Sobre com conteúdo autoral, sem registros de teste no principal. Testes em memória não comprovam esse ciclo real.
4. Falta preparar o conteúdo de apresentação: o banco continua sem serviços, projetos e artigos. Isso não quebra o site, mas uma publicação vazia não demonstra o fluxo editorial solicitado.
5. Falta autorização explícita para executar o deploy e o smoke test HTTPS após publicar.

**Não impedem a versão reduzida:** segundo banco, conta demo, papel PostgreSQL demo, Academy, Documentos, Eventos, CRM, Careers, e-mail transacional, gráficos adicionais ou Storage, desde que capas/galerias não sejam anunciadas como disponíveis sem configuração. Nenhum desses módulos precisa ser concluído para esta publicação.

Referências conferidas: [Vercel — Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Prisma 7 — Vercel](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/serverless/deploy-to-vercel), [Better Auth — opções](https://better-auth.com/docs/reference/options), [Supabase — PostgreSQL/TLS](https://supabase.com/docs/guides/database/connecting-to-postgres).
