# Mystra Studio — ambiente de demonstração

**Suspenso em 09/11/2026 por decisão da proprietária.** Arquivos e configurações preservados, sem novas operações neste ambiente. A primeira publicação usa o banco principal e não depende deste plano; veja FINALIZACAO-V1.md.

Estado atualizado em 07/11/2026: **arquitetura preparada; configuração do banco demo ainda não validada nem homologada**. A proprietária informou que criou o projeto separado mystra-studio-demo. Foi preparado o arquivo local .env.demo, com segredo próprio e conexões inicialmente vazias. O projeto de homologação ainda está pendente. Consulte [CONFIGURAR-DEMO.md](CONFIGURAR-DEMO.md) para preencher e validar o novo destino. O agente não criou recursos externos, contas, buckets ou registros sintéticos no banco atual. Nenhuma migration ou política foi aplicada nesta preparação; não houve deploy.

## Auditoria e limites atuais

Foram lidos AUDITORIA-GERAL.md e REDESIGN-ADMIN.md e revisados autenticação, permissões, modelos, migrations, páginas, ações e arquivos. Better Auth e o ADMIN existentes foram preservados. O login, sessão e logout normais já tinham confirmação manual da proprietária; não foram reutilizadas suas credenciais para testes novos.

O PostgreSQL atual respondeu à consulta somente leitura; Prisma validate passou e migrate status confirmou as quatro migrations sincronizadas. Os modelos existentes atendem aos exemplos: Content/Category/Tag/Technology, Event/EventCategory/EventScheduleItem, Lead e Job. Nenhum modelo novo foi criado.

Consulta final em transação READ ONLY: um usuário existente; zero conteúdos, leads, eventos, candidaturas e mídias; zero buckets e políticas Storage. Não foi copiado ou gerado dado no projeto atual. O estado vazio de Storage foi confirmado novamente, não apenas presumido pela auditoria anterior.

Academy continua sem cursos/turmas/inscrições persistentes. Documentos continua sem biblioteca persistente. Storage não possui homologação anterior; não existem projetos/buckets demo configurados nesta etapa. Esses recursos não são preenchidos artificialmente pelo seed. CRUDs reais anteriores continuam sujeitos à homologação isolada indicada na auditoria.

## Arquitetura e isolamento

| Contexto | Arquivo local | Banco | Origem local | Build/cache |
| --- | --- | --- | --- | --- |
| Desenvolvimento | .env atual | Projeto existente, preservado | http://localhost:3000 | .next |
| Homologação | .env.homologacao | Novo projeto Supabase próprio | http://localhost:3002 | .next-homolog |
| Demonstração | .env.demo | Outro novo projeto Supabase | http://localhost:3001 | .next-demo |

DATABASE_URL e DIRECT_URL do mesmo projeto são conexões para o mesmo banco. Não constituem isolamento. São necessários **três projetos distintos** para esses contextos.

Os launchers leem o identificador do projeto principal a partir das conexões existentes, conferem os identificadores declarados e recusam destinos iguais, referências divergentes, URLs não canônicas e credenciais de autenticação compartilhadas. O processo filho recebe valores vazios para as credenciais principais; não faz fallback para elas. Arquivos .env.local/.env.development/.env.production e variantes prioritárias exigem revisão antes de iniciar o launcher, para evitar sobreposição silenciosa.

Modo demo exige papel PostgreSQL `mystra_demo_app`, marcador persistido do ambiente e privilégio de leitura de negócio. A verificação inicial e periódica confere o papel efetivo, privilégios elevados, memberships, escrita de negócio, leitura privada e alteração dos logs. Conexões inválidas falham fechadas. Um nome de variável ou um papel chamado “demo” isoladamente não autorizam o acesso.

Não copie dumps, usuários, hashes, sessões, leads, candidatos, arquivos privados, settings, canais reais, segredos ou logs do ambiente principal. O seed usa conteúdo original e sintético; não faz importação.

## Variáveis e preparação local

Copie `.env.demo.example` para `.env.demo` e `.env.homologacao.example` para `.env.homologacao`. Preencha-os somente no editor local. Todos os arquivos preenchidos são ignorados por .gitignore; apenas exemplos sem segredos são permitidos. Não altere o .env de desenvolvimento para alternar ambientes.

| Variável | Regra |
| --- | --- |
| MYSTRA_ENV | demo ou homologation, imposto pelo launcher |
| PRIMARY_SUPABASE_PROJECT_REF | Identificador do projeto atual, conferido com .env |
| DEMO_SUPABASE_PROJECT_REF | Identificador real do novo projeto demo |
| HOMOLOG_SUPABASE_PROJECT_REF | Identificador real do novo projeto de testes, distinto dos outros |
| DEMO_ISOLATED_CONFIRMED / HOMOLOG_ISOLATED_CONFIRMED | true somente após verificar os projetos independentes |
| DEMO_DATABASE_URL | Conexão demo usando exclusivamente mystra_demo_app |
| DEMO_DIRECT_URL | Conexão proprietária do projeto demo, somente CLI/bootstrap |
| HOMOLOG_DATABASE_URL / HOMOLOG_DIRECT_URL | Conexões do projeto de homologação |
| DEMO_BETTER_AUTH_SECRET / HOMOLOG_BETTER_AUTH_SECRET | Segredos aleatórios diferentes entre si e do principal |
| DEMO_BETTER_AUTH_URL / HOMOLOG_BETTER_AUTH_URL | Origens exatas, distintas; localhost nos exemplos |
| DEMO_ACCESS_MODE | Somente read-only; interactive é recusado |
| DEMO_OPERATION_CONFIRM | Identificador exato do projeto demo; autoriza prepare/seed/account |
| DEMO_RESTORE_CONFIRM | RESTORE: seguido do identificador demo; somente durante restauração autorizada |
| DEMO_MIGRATIONS_CONFIRM / HOMOLOG_MIGRATIONS_CONFIRM | Identificador exato do respectivo projeto, somente após revisão e autorização das migrations |
| TEST_DATABASE_URL / TEST_DATABASE_ISOLATED | Somente homologação; URL independente e true após conferência |
| DEMO_SUPABASE_URL / DEMO_STORAGE_SERVICE_ROLE_KEY / DEMO_STORAGE_BUCKET | Opcionais; projeto demo, chave própria e bucket mystra-demo-* |

Use as strings reais do painel Connect, com senha percent-encoded. Os destinos isolados exigem `sslmode=verify-full` (preferido) ou `sslmode=require`; parâmetros capazes de substituir host/usuário/banco são rejeitados. Para migrations e seed, use direct IPv6 ou session pooler IPv4, **porta 5432**. Para runtime, session pooler é a opção simples; transaction pooler 6543 pode ser usado após homologação. No pooler, o usuário do papel próprio tem o formato PAPEL.REFERÊNCIA, conforme o Supabase. Nunca use a service role key como senha PostgreSQL.

Para gerar e gravar um segredo local sem imprimi-lo, após copiar o exemplo, execute em PowerShell (para homologação, troque arquivo e nome da variável):

```powershell
$demoFile = Join-Path (Get-Location) '.env.demo'
$demoText = [IO.File]::ReadAllText($demoFile)
if ($demoText -notmatch '(?m)^DEMO_BETTER_AUTH_SECRET=""\r?$') { throw 'Campo não vazio: preserve o segredo existente.' }
$demoBytes = New-Object byte[] 32
$demoGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
$demoGenerator.GetBytes($demoBytes)
$demoGenerator.Dispose()
$demoSecret = [BitConverter]::ToString($demoBytes).Replace('-', '')
[IO.File]::WriteAllText($demoFile, ($demoText -replace '(?m)^DEMO_BETTER_AUTH_SECRET=""\r?$', ('DEMO_BETTER_AUTH_SECRET="' + $demoSecret + '"')))
Remove-Variable demoSecret, demoText, demoBytes, demoGenerator
```

Não publique nem envie esses valores em mensagens. Não use prefixo NEXT_PUBLIC_ para credenciais. Os launchers removem a URL proprietária e confirmações operacionais do processo web.

## Provisionamento do banco — aguarda autorização

1. Crie manualmente projetos Supabase independentes para demo e homologação. Não foi criado nenhum recurso externo pelo agente.
2. Preencha os exemplos locais, confirme as três referências distintas e gere os segredos próprios. Confira `npm run env:demo -- validate` e `npm run env:demo -- status` (equivalentes para homologação).
3. Revise as **quatro migrations existentes**. Em um projeto novo, migrate deploy aplicará todas as pendentes. Não execute antes de autorizar esse conjunto exato. O launcher exige a confirmação de migrations do projeto correspondente. O comando preparado é `npm run env:demo -- migrate-deploy`; homologação usa `npm run env:homolog -- migrate-deploy`. Nunca use reset ou db push.
4. No projeto demo recém-migrado e vazio, autorize a preparação com DEMO_OPERATION_CONFIRM igual à referência e execute `npm run demo:prepare`. O script recusa banco já populado, inclusive com usuários/settings. A permissão recruitment:manage criada pela migration existente é a única exceção estrutural. Um marcador válido torna a preparação idempotente; marcador de outro projeto é recusado.
5. Revise **security/proposals/demo_runtime_role.sql** e solicite autorização específica antes de executá-lo. Ele cria um papel inicialmente NOLOGIN/NOBYPASSRLS, revoga privilégios de PUBLIC/anon/authenticated somente nas tabelas desse novo projeto, concede SELECT de negócio e cria políticas RLS exclusivas do papel. Não concede acesso a currículos/anexos/inscritos/notas privadas ou metadados de migrations. Session/RateLimit permitem operações necessárias à autenticação; AdminLog permite apenas inserção de auth.login e leitura mínima para RETURNING e atividade de seed/restauração. Não há permissão para escrita de conteúdo, usuários ou infraestrutura.
6. O SQL exige `SET mystra.demo_project_ref = 'REFERÊNCIA_DEMO_VERIFICADA'` na sessão e o marcador persistido correspondente. Use somente no novo projeto demo. Ele recusa um papel preexistente para exigir revisão. Configure a senha do papel privadamente, por exemplo com `\password mystra_demo_app` no psql; habilite LOGIN explicitamente após revisar privilégios. Não conceda memberships. Preencha DEMO_DATABASE_URL com esse papel, sem reutilizar o proprietário no servidor web.
7. Execute seed e cadastro da conta conforme abaixo. Retire confirmações operacionais do arquivo local após concluir.

O SQL é uma **proposta**, fora de prisma/migrations: não foi aplicado ou validado em PostgreSQL independente nesta execução. Nenhuma migration nova foi preparada ou aplicada. A verificação runtime deve ser homologada com os privilégios reais antes de abrir acesso externo.

## Seed e restauração

```sh
npm run demo:plan
```

Esse comando é offline e não lê credenciais nem conecta ao banco. Plano: 5 serviços, 3 projetos conceituais, 4 artigos (um rascunho), 3 eventos, 5 leads, 2 vagas; categorias, tags, tecnologias e programação relacionadas. Zero cursos, documentos, participantes, candidaturas ou objetos de mídia. O autor editorial é sintético, inativo e sem senha. E-mails de exemplos usam example.com, não pessoas reais. Não são fabricados clientes, métricas comerciais, consentimentos de visitantes ou operações antigas.

Depois de provisionar e autorizar o projeto correto:

```sh
npm run demo:seed
```

O seed exige projeto distinto, confirmação explícita e marcador. Usa transação, lock consultivo, IDs próprios e registro dos IDs gerenciados. Repeti-lo não duplica dados nem sobrescreve edições. A data de referência é persistida no primeiro seed; execuções seguintes não deslocam eventos silenciosamente. Colisões sem manifesto e alterações na versão/conjunto de fixtures exigem revisão. Cada criação efetiva registra demo.seed na data real da execução, sem inventar histórico administrativo.

Restauração, somente após autorização explícita e DEMO_RESTORE_CONFIRM configurado:

```sh
npm run demo:restore
```

Reaplica os campos sintéticos conhecidos e suas relações de tags/tecnologias. **Não apaga registros extras, contas, sessões, arquivos ou históricos**, não altera senhas e não limpa tabelas. Não é um reset completo de sandbox. Preserva a data de referência. Registra demo.restore na execução real. Não há agendamento automático. Para renovar datas ou alterar fixtures, é necessária uma evolução versionada revisada.

## Conta demo e permissões

```sh
npm run demo:account
```

Execute em terminal interativo depois de configurar o banco. Defina um e-mail reservado @example.com ou @example.test e uma senha exclusiva de 12–128 caracteres, informada com entrada oculta. Não envie senha pelo chat. O hash usa Better Auth; nenhuma senha fixa está no repositório. A conta utiliza o perfil existente EDITOR **somente com demo:explore** no banco demo; não cria ADMIN. Recusa papel com permissões extras, conta existente, domínio pessoal e confirmação inválida. O bootstrap normal de ADMIN é bloqueado em modo demo.

Teto de autorização no servidor permite exclusivamente demo:explore nesse ambiente, mesmo se outros grants forem atribuídos indevidamente. Contas com esse grant são rejeitadas no contexto normal; contas normais sem o grant são rejeitadas na demo. A sessão valida usuário ativo e vínculos a cada acesso, tem prefixo de cookie próprio, segredo próprio e cache de cookie desabilitado. IP/User-Agent não são gravados em Session na demo. RateLimit mantém os identificadores necessários à proteção de login; sua retenção operacional e a política de acesso precisam ser revisadas antes de publicação. Isso não equivale a ausência absoluta de dados técnicos de visitantes.

Não há cadastro público, endpoint de entrada automática ou autenticação simulada. A API Better Auth demo permite apenas login, consulta de sessão e logout; alteração de senha, cadastro e demais endpoints são recusados. A divulgação futura das credenciais demo é uma decisão operacional da proprietária, nunca reutilizando a conta principal.

## Experiência disponível

Após configuração e homologação:

```sh
npm run env:demo -- dev
```

Abra http://localhost:3001/admin/login. A origem de homologação é http://localhost:3002, por `npm run env:homolog -- dev`. Desenvolvimento continua usando `npm run dev` e a porta 3000.

Rotas demo: `/demonstracao`, `/admin/demonstracao`, `/admin/explorar/{servicos,portfolio,blog,eventos,leads,vagas}` e os respectivos detalhes `/{id}`. Dashboard e portal consultam registros persistidos do projeto demo. As telas de exploração reutilizam consultas, filtros, renderizador rico, tabelas e shell existentes, sem reutilizar grants de edição. Navegação, breadcrumbs, sidebar compacta e Ctrl/Cmd+K são preservados. Usuários, permissões, configurações, logs sensíveis e arquivos privados não aparecem no menu e continuam bloqueados no servidor.

Server Actions administrativas são recusadas em modo demo, além do teto de permissões e da restrição Prisma/PostgreSQL. Contato/orçamento, inscrições de eventos, candidaturas e uploads administrativos são bloqueados antes de processar/gravar o envio. O portal informa os limites e não solicita dados pessoais nos formulários comerciais. Careers permanece demonstrativo mesmo que CAREERS_MODE seja alterado. Não existe serviço de e-mail configurado nesta etapa. Newsletter, pagamento, coleta comercial e candidatura reais não são habilitados.

O modo de edição por visitante **não foi implementado**: exigiria sandbox/tenant por sessão, quotas e restauração homologada. Não existe edição compartilhada indiscriminada nem botão que finge salvar. A demonstração inclui leitura de rascunho autorizada; seu slug público continua protegido pelas regras existentes.

## Storage

Não foi criado bucket nem enviado arquivo. O seed não salva referências de mídia sem objetos reais. Imagens de capa são opcionais; os estados sem imagem existentes permanecem válidos.

Para configuração futura autorizada, use apenas o novo projeto demo e bucket **privado** com nome mystra-demo-*, chave exclusiva no servidor, sem políticas anônimas de upload/listagem/download. A configuração confere o host da API contra a referência demo e recusa bucket fora do prefixo. Nunca reutilize buckets de currículos ou anexos do principal. A conta visitante não tem uploads, downloads privados ou gerenciamento de arquivos. Imagens demonstrativas devem ser originais/licenciadas; sua carga controlada, metadados e políticas devem ser homologados antes de aparecerem como disponíveis. Storage de homologação também depende de configuração própria; não há fallback para chaves principais.

## Testes e evidências

| Verificação | Resultado |
| --- | --- |
| npm test | 85 testes: 80 aprovados, cinco integrações PostgreSQL ignoradas por falta de banco isolado |
| Novos testes offline | Destino/papel/TLS, remoção de segredos do processo filho, teto de permissões, conta sem ADMIN com hash real, domínio reservado, marcador, colisões, seed idempotente, preservação de edições, restauração limitada e bloqueio de coleta/indexação |
| npm run lint | Aprovado, sem avisos |
| npm run typecheck / npx tsc --noEmit | Aprovados |
| npm run build | Aprovado |
| Prisma validate / migrate status | Schema válido; quatro migrations do banco atual sincronizadas; consultas somente leitura |
| npm run db:check | PostgreSQL atual acessível; sem escrita |
| demo:plan | Plano validado offline, sem conexão |
| demo:seed e env:demo -- dev sem configuração | Recusados antes de conectar; comportamento esperado, não homologação do seed real |
| npm run audit:demo-ui | 15 layouts de componentes isolados, em 1440/1024/768/390/320 px: zero overflow, zero violações axe detectadas, zero exceções e zero escritas |
| HTTP local normal sem sessão | /admin/login acessível; /admin e /admin/explorar/blog retornaram redirecionamento para login no stream do Next, sem sessão importada ou bypass |

As capturas da prévia ficam em `.next/cache/demo-ui/` e podem ser removidas pelo Next. O cenário usa componentes reais com navegação adaptada e dados vazios identificados; **não é um painel autenticado ou banco simulado apresentado como funcional**. Axe não certifica conformidade WCAG; revisão manual com leitor de tela permanece recomendada. Mocks não comprovam PostgreSQL, RLS, pooler ou Storage reais.

Depois de criar homologação independente e autorizar os testes, configure TEST_DATABASE_URL desse projeto e TEST_DATABASE_ISOLATED=true. Execute `npm run env:homolog -- integration-test`. As cinco suítes existentes criam e removem apenas schemas temporários próprios; o gate recusa o projeto principal e o demo, inclusive aliases de pooler/direct. Nunca execute essas suítes no banco principal. A suíte demo offline continua em `npm test`.

Permanecem **não executados**: migrations e papel SQL no novo projeto, seed e idempotência reais, login/logout demo, isolamento entre sessões reais dos projetos, políticas efetivas RLS, Storage/upload/download e CRUDs em homologação. Nenhuma aprovação fictícia foi atribuída a esses fluxos.

## Arquivos principais e próximos passos

Configuração: .env.demo.example, .env.homologacao.example, .env.example, .gitignore, next.config.ts, prisma.config.ts e package.json.

Segurança/execução: lib/environment.ts, isolated-process.ts, demo-policy.ts, demo-marker.ts, demo-role.ts, demo-runtime.ts, db.ts, auth.ts, auth-config.ts, authorization.ts, api-authorization.ts, permissions.ts, form-security.ts, site-policy.ts, storage.ts e test-database.ts; scripts/environment-run.ts e scripts/lib/isolated-environment.ts. Bootstrap ADMIN, APIs de autenticação/envios/uploads e Careers receberam guards condicionais.

Demo/seed: features/demo/{access,account,fixtures,seed,navigation,dashboard,explorer,about,demo.css}; scripts/demo.ts; security/proposals/demo_runtime_role.sql; components/demo/notice.tsx; novos routes de demonstração/exploração. Layouts, login, dashboard e formulários públicos receberam condições demo preservando o contexto normal. Testes: tests/demo-environment.test.ts, tests/demo-seed.test.ts, scripts/audit-demo-ui.mjs e adaptação da prévia isolada existente.

Próximos passos: criar os dois projetos independentes; configurar os arquivos locais; revisar e autorizar migrations/papel/políticas; preparar marcador, seed e conta; homologar login, SQL, filtros, estatísticas, privacidade e Storage; executar as integrações; só então planejar deploy. Para deploy futuro, usar origens HTTPS e segredos próprios, cookies seguros, builds separados, conexões de runtime limitadas e parâmetros de ambiente explícitos. Demo e homologação recusam indexação mesmo com flags comuns ativadas. Não transportar a build entre contextos ou usar o launcher normal com credenciais demo. Prefira checkouts/deployments separados também para geração de tipos em builds simultâneas.

Referências de conexão consultadas: [Supabase — conexão PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [Prisma 7 — conexões](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections) e [poolers](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/pgbouncer). As instruções não substituem a verificação das opções oferecidas no painel do novo projeto.
