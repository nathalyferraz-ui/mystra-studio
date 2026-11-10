# Auditoria geral — Etapa 11

Atualização de escopo em 09/11/2026: a proprietária suspendeu a preparação de demo e priorizou uma versão 1.0 com o banco principal. Consulte [FINALIZACAO-V1.md](FINALIZACAO-V1.md) e [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). Módulos adiados foram retirados do portal sem excluir código/dados. Segundo banco, conta demo e conclusão de todos os módulos não são bloqueios dessa versão reduzida. Os achados e contagens abaixo descrevem o escopo amplo da auditoria histórica, não uma lista automática de impedimentos da 1.0.

Atualização de preparação demo (07/11/2026): ver [AMBIENTE-DEMO.md](AMBIENTE-DEMO.md). A proprietária ainda não criou os projetos separados de demo/homologação. Foram implementados launchers isolados, seed protegido, conta restrita e exploração somente leitura, sem executar escrita no banco atual. Academy e Documentos continuam sem módulos persistentes; consulta somente leitura confirmou Storage sem buckets/políticas. Esta preparação não resolve a homologação dos CRUDs ou dos arquivos remotos. As contagens da auditoria original abaixo permanecem históricas.

Data: 06/11/2026, America/Sao_Paulo. Auditoria do código existente, banco, autenticação, segurança, testes e experiência local. Nenhum deploy, reset, fixture comercial ou migration nova foi executado.

Atualização Etapa 12A (07/11/2026): primeiro ADMIN criado por execução interativa da proprietária; login, dashboard, manutenção da sessão ao atualizar, logout e proteção posterior de /admin confirmados por ela. Consulta somente leitura confirmou conta ADMIN, conta de senha compatível e sessão válida antes do logout; depois, zero sessões e ADMIN preservado. CFG-01 resolvido. O inventário e os testes da Etapa 11 abaixo são históricos; habilitar o login não homologa os demais CRUDs.

## Parecer

O portal vazio/demonstrativo passou nas verificações executadas e o primeiro acesso administrativo real foi confirmado na Etapa 12A. **O sistema completo ainda não está homologado para publicação**: Storage e banco independente de testes estão ausentes; Academy e Documentos não possuem os módulos persistentes previstos anteriormente. Mocks e build aprovado não comprovam integração real dos demais módulos.

| Gravidade | Identificados | Corrigidos | Pendentes |
| --- | ---: | ---: | ---: |
| CRÍTICO | 1 | 1 | 0 |
| ALTO | 9 | 5 | 4 |
| MÉDIO | 11 | 8 | 3 |
| BAIXO | 5 | 3 | 2 |
| Total | 26 | 17 | 9 |

Não foi confirmada outra falha crítica no escopo inspecionado. Isso não garante ausência de vulnerabilidades: fluxos autenticados positivos, arquivos Supabase e cargas elevadas não foram exercitados.

## Ambiente e método

Next 16.4.5, React 19.3, Prisma 7.10.1 e Better Auth 1.7.17. Convenções conferidas na documentação instalada do Next e no código instalado das bibliotecas. Revisão de rotas, ações, repositórios, validações, permissões, projeções públicas, publicação/cache, uploads e configurações.

Diagnóstico PostgreSQL em transações READ ONLY. As contagens das 37 tabelas ficaram iguais antes/depois dos testes HTTP/navegador, incluindo RateLimit e logs. Nenhum registro de teste foi criado no banco principal. A única alteração de banco foi a correção de ACL/RLS expressamente autorizada, descrita abaixo.

Chrome local contra build de produção. Na auditoria visual, qualquer pedido diferente de GET/HEAD foi bloqueado. POSTs HTTP separados testaram somente recusa de origem, bloqueio demonstrativo, autenticação indisponível e ações sem sessão, antes de escrita. Não há Playwright, Docker/PostgreSQL local ou TEST_DATABASE_URL configurados. Não foi substituído PostgreSQL por outro banco.

Evidências sanitizadas em `.next/cache/audit11/`, diretório temporário ignorado pelo Git; outra compilação pode removê-lo. Os resultados essenciais estão registrados neste documento.

## Inventário real

Os estados classificam o fluxo completo. Uma verificação parcial aprovada não transforma uma funcionalidade dependente de configuração em homologada.

| Módulo / rota | Estado | Evidência / limite |
| --- | --- | --- |
| Home / | IMPLEMENTADO E TESTADO | Defaults editoriais, navegação, estado vazio, renderização e ampliação de texto; edição administrativa separada abaixo. |
| O Estúdio /sobre | IMPLEMENTADO E TESTADO | Layout original, âncoras, responsividade e validação estrutural; publicação administrativa separada. |
| Soluções /servicos | IMPLEMENTADO, MAS NÃO TESTADO | Consulta, filtros e estado vazio verificados; serviço publicado e fluxo positivo não homologados. |
| Portfólio /portfolio | IMPLEMENTADO, MAS NÃO TESTADO | Consultas, filtros, galeria e metadados reais; sem projetos publicados para teste positivo. |
| Academy /academia | APENAS INTERFACE | Placeholder/estrutura institucional e FAQ; sem cursos, turmas ou inscrições persistentes. |
| Insights /blog | IMPLEMENTADO, MAS NÃO TESTADO | Consulta vazia, filtros e renderização segura testados; artigo publicado real não homologado. |
| Contato /contato | BLOQUEADO POR CONFIGURAÇÃO | Formulário, Zod, token, limites e persistência implementados; validação local testada, envio positivo sem segredo indisponível. |
| Orçamento /orcamento | BLOQUEADO POR CONFIGURAÇÃO | Quatro etapas e vínculo com serviço publicado implementados; envio e anexo positivos não homologados. |
| Eventos /eventos e calendário | IMPLEMENTADO, MAS NÃO TESTADO | Fusos, calendário, filtros e regras testados; inscrição/concorrência reais não homologadas. |
| Documentos /downloads | NÃO IMPLEMENTADO | Rota inexistente, sem biblioteca persistente de documentos. |
| Careers /trabalhe-conosco | IMPLEMENTADO E TESTADO | Portal vazio e demo verificados; POST bloqueia coleta antes de processar corpo ou gravar. Recrutamento positivo separado abaixo. |
| Privacidade /privacidade | PARCIALMENTE IMPLEMENTADO | Aviso técnico acessível; controlador, operação, retenção e revisão jurídica pendentes. |
| Detalhes de serviços/projetos/artigos/eventos/vagas | IMPLEMENTADO, MAS NÃO TESTADO | Slugs inexistentes e regras de publicação verificados; páginas com registros publicados não homologadas. Não há detalhes acadêmicos/documentais. |
| Páginas inexistentes | IMPLEMENTADO E TESTADO | Sete verificações HTTP, fallback 404 e noindex. Streaming do Next pode manter HTTP 200 com fallback 404. |
| Dashboard /admin | BLOQUEADO POR CONFIGURAÇÃO | Consultas reais de conteúdo, institucional, eventos, CRM e recrutamento; visualização autenticada não homologada. |
| Páginas institucionais /admin/paginas | BLOQUEADO POR CONFIGURAÇÃO | Rascunho/publicação, revisão, concorrência e autorização implementados; testes locais/negativos aprovados, integração positiva pendente. |
| Serviços /admin/servicos | BLOQUEADO POR CONFIGURAÇÃO | CRUD, categoria, SEO, publicação e preview reais; sem operador de teste. |
| Projetos /admin/portfolio | BLOQUEADO POR CONFIGURAÇÃO | CRUD, galeria ordenada, arquivo e preview reais; persistência/upload positivos pendentes. |
| Artigos /admin/blog | BLOQUEADO POR CONFIGURAÇÃO | Tiptap, JSON estruturado, tags, preview e publicação implementados; editor autenticado não exercitado no navegador. |
| Categorias, tags e tecnologias | BLOQUEADO POR CONFIGURAÇÃO | CRUD/constraints reais; exclusão passa a bloquear linha antes de conferir referências. |
| Cursos /admin/cursos | APENAS INTERFACE | Placeholder, sem CRUD. |
| Instrutores, turmas e inscrições acadêmicas | NÃO IMPLEMENTADO | Sem modelos ou rotas funcionais. |
| Eventos, palestrantes e programação | BLOQUEADO POR CONFIGURAÇÃO | CRUD e inscrições com locks, validação e histórico; escrita e concorrência reais pendentes. |
| Documentos /admin/documentos | APENAS INTERFACE | Placeholder; sem uploads, versões ou downloads controlados de documentos. |
| Mídias /admin/midias | BLOQUEADO POR CONFIGURAÇÃO | Validação, reencodificação e referências protegidas; zero buckets. |
| CRM /admin/leads | PARCIALMENTE IMPLEMENTADO | Tabela, filtros, status, responsável, notas e histórico reais, operacionalmente bloqueados por login. CSV comercial ausente. |
| Vagas /admin/vagas | BLOQUEADO POR CONFIGURAÇÃO | CRUD, publicação, encerramento, arquivo e duplicação reais; escrita autenticada não homologada. |
| Candidaturas /admin/candidaturas | BLOQUEADO POR CONFIGURAÇÃO | Pipeline, notas, histórico e arquivos privados preparados; demo impede coleta pública; Storage/integração positiva ausentes. |
| Equipe e parceiros | BLOQUEADO POR CONFIGURAÇÃO | Coleções estruturadas publicáveis; nenhuma pessoa/parceria inventada. |
| FAQ /admin/faq | BLOQUEADO POR CONFIGURAÇÃO | Coleção central e associações implementadas; defaults públicos testados, publicação não homologada. |
| Depoimentos | NÃO IMPLEMENTADO | Não há seção ou CRUD. Requisito anterior condicional; nenhum depoimento falso criado. |
| Usuários /admin/usuarios | BLOQUEADO POR CONFIGURAÇÃO | Gestão/revogação/proteção do último ADMIN implementadas; mocks verificam recusas antes da escrita; zero contas reais. |
| Permissões /admin/permissoes | BLOQUEADO POR CONFIGURAÇÃO | Matriz de concessões por perfil testada; sessões reais não homologadas. |
| Logs /admin/logs | BLOQUEADO POR CONFIGURAÇÃO | Logs transacionais e consulta protegida; sem atividades fictícias. |
| Configurações, navegação, footer e SEO | BLOQUEADO POR CONFIGURAÇÃO | Defaults/projeções públicas testados; publicação administrativa positiva pendente. Desktop/mobile compartilham fonte. |
| Recuperação de senha e convites | NÃO IMPLEMENTADO | Sem provedor de e-mail ou envio simulado; bootstrap interativo é o mecanismo inicial existente. |

## Banco, migrations e RLS

`prisma.config.ts` carrega dotenv e usa DIRECT_URL na CLI. Schema PostgreSQL; execução por DATABASE_URL com Prisma e @prisma/adapter-pg. Conexões runtime/direct confirmadas no mesmo projeto/banco. Nenhuma URL local alterada.

Resultado final: **37 tabelas públicas com RLS**, 44 FKs validadas, nove CHECKs validados, 109 índices válidos e 14 enums. Quatro migrations aplicadas com checksums correspondentes:

1. 20261105000000_postgresql_cms.
2. 20261105010000_commercial_crm.
3. 20261105020000_events_workshops.
4. 20261105030000_careers_ats.

Prisma validate aprovado; migrate status atualizado; migrate diff vazio. Diff não verifica ACL/RLS: esses itens foram consultados à parte. Constraints de slugs/vínculos inspecionadas. Inscrições de eventos usam lock do evento e unicidade; conteúdo, CRM, institucional e ATS possuem estratégias de concorrência. A efetividade sob transações concorrentes ainda exige banco isolado.

A tabela técnica `_prisma_migrations` inicialmente tinha RLS desabilitada e privilégios para anon/authenticated. Após autorização explícita, foi executado **somente** `security/proposals/20261106_prisma_migrations_privileges.sql`: revogação para anon/authenticated/PUBLIC e RLS habilitada, preservando o proprietário usado pelo Prisma. SELECT/INSERT/UPDATE/DELETE/TRUNCATE agora negados aos dois papéis; proprietário e histórico preservados. Nenhuma tabela de negócio, bucket ou política de Storage alterada. Não houve nova migration nem aplicação em outro ambiente.

Na leitura da Etapa 11, o banco não tinha usuários, serviços, projetos, artigos, mídias, eventos, leads, vagas, candidaturas ou publicações institucionais. Em 07/11/2026, a proprietária criou o primeiro ADMIN e realizou login; isso não é um fixture de teste. Não havia políticas públicas nas tabelas inspecionadas. RLS não substitui autorização das operações Prisma no servidor.

## Problemas — CRÍTICO

| ID | Módulo, descrição e impacto | Arquivos | Correção / estado | Evidência |
| --- | --- | --- | --- | --- |
| SEG-01 | Metadados de migrations com leitura/escrita para papéis públicos; risco de leitura/adulteração pela Data API se expostos. | security/proposals/20261106_prisma_migrations_privileges.sql | CORRIGIDO com autorização explícita: ACL revogada, RLS habilitada. | Privilégios antes/depois; registros e proprietário preservados; migrate status atualizado. Sem exploração externa. |

## Problemas — ALTO

| ID | Módulo, descrição e impacto | Arquivos | Correção / estado | Evidência |
| --- | --- | --- | --- | --- |
| SEG-02 | Snapshot publicado autorizava imagens de seções ocultas e integrantes/parceiros não publicados. | features/institutional/public-media.ts, queries.ts | CORRIGIDO: somente referências públicas visíveis e identidade publicada autorizam leitura. | Regressões de imagens ocultas, itens privados e imagem social. Arquivos reais não disponíveis. |
| DAT-01 | Compensação de upload podia apagar objeto após commit com falha de transporte. | features/media/compensation.ts, app/api/media/route.ts | CORRIGIDO: excluir somente quando ausência de referência confirmada; preservar e sinalizar incerteza. | Mocks de referência existente, commit incerto, Storage/log indisponíveis. |
| HOM-02 | Testes podiam confundir aliases pooler/direct do mesmo banco com destinos independentes. | lib/test-database.ts, cinco integrações, scripts/careers-prepare-test.ts | CORRIGIDO: confirmação explícita, comparação com ambas as conexões/referência Supabase, recusa de options/schema, search_path temporário por conexão. | Testes de aliases, papéis personalizados, loopback e flags; nenhuma escrita no principal. |
| CFG-03 | Cliente Prisma global podia ignorar remoção/alteração de DATABASE_URL em recarga local. | lib/db.ts, tests/db-client.test.ts | CORRIGIDO: validar antes de reutilizar e identificar configuração por hash. Reinício segue recomendado após mudar ambiente/schema. | Teste sem consultas com destinos loopback sintéticos; ausência recusa, troca de destino recria cliente. |
| CFG-01 | Inicialmente sem segredo e usuários. Configuração e primeiro ADMIN concluídos na Etapa 12A. | .env local, lib/auth.ts, scripts/bootstrap-admin.ts, scripts/configure-auth.ts | CORRIGIDO em 07/11/2026: bootstrap da proprietária; login, dashboard, manutenção ao atualizar, logout e proteção posterior confirmados. | READ ONLY: um ADMIN ativo, conta de senha correta, sessão válida antes do logout e zero sessões depois; marcador e logs reais de bootstrap/login. Sem consulta ou exposição de senha/token. |
| CFG-02 | Storage sem configuração/buckets/políticas; uploads/downloads positivos indisponíveis. | lib/storage.ts, features/crm/attachments.ts, features/careers/storage.ts | PENDENTE DE CONFIGURAÇÃO: buckets privados distintos, chave somente no servidor e políticas revisadas. | Consultas a storage.buckets/pg_policies e flags; zero buckets. |
| HOM-01 | Sem banco independente para testar escrita, sessão, publicação e concorrência reais. | .env.example, tests/*.integration.test.ts | PENDENTE: TEST_DATABASE_URL independente e TEST_DATABASE_ISOLATED=true após verificar o destino. | Cinco integrações ignoradas; mocks não comprovam PostgreSQL. |
| FUN-01 | Academy sem CRUD/cursos/instrutores/turmas/inscrições persistentes. | rota pública genérica, /admin/cursos, prisma/schema.prisma | PENDENTE DE IMPLEMENTAÇÃO em etapa própria, com modelagem revisada/autorizada. | Inventário de código/schema e placeholder; sem CRUD encontrado. |
| FUN-02 | Documentos sem CRUD, versões, arquivos ou downloads controlados. | /admin/documentos, ausência de /downloads, prisma/schema.prisma | PENDENTE DE IMPLEMENTAÇÃO. Não foi criada interface falsa para mascarar a ausência. | Inventário e GET /downloads inexistente. |

## Problemas — MÉDIO

| ID | Módulo, descrição e impacto | Arquivos | Correção / estado | Evidência |
| --- | --- | --- | --- | --- |
| SEG-03 | Corpo de autenticação sem limite de leitura, inclusive sem Content-Length. | app/api/auth/[...all]/route.ts | CORRIGIDO: limite de 8 KiB antes do handler; logout sem corpo preservado. | Teste de stream limitado sem Content-Length e revisão do handler. Login positivo pendente. |
| SEG-04 | Configuração podia aceitar segredo evidentemente fraco ou HTTP em produção, arriscando cookies sem Secure. | lib/auth-config.ts, lib/auth.ts | CORRIGIDO: recusar placeholders/segredos insuficientes e exigir HTTPS em produção; Secure explícito. Não estima entropia. | Matriz de configuração e código instalado de cookies; sem sessão real. |
| VAL-01 | URLs editoriais/projetos aceitavam credenciais embutidas. | features/cms/rich-text.ts, schema.ts | CORRIGIDO: rejeitar userinfo/controles mantendo links válidos. | Regressões de URLs/documentos ricos. |
| VAL-02 | MIME podia divergir da assinatura da imagem; API comercial devolvia 400 indistintamente. | features/media/validation.ts, features/crm/attachments.ts, app/api/leads/route.ts | CORRIGIDO: assinatura PNG/JPEG/WebP antes do decoder, recusa de SVG disfarçado, erros 413/409/422/503 e recusa prévia de Storage ausente. | Bytes reais, MIME falso, limites e reencodificação testados; envio comercial positivo pendente. |
| DAT-02 | Exclusão de taxonomia sujeita a corrida com nova associação após contagem de uso. | features/taxonomy/actions.ts | CORRIGIDO no código: lock de linha antes de contar/remover, preservando transação/constraints. | Ordem lock/consulta/delete revisada, build/typecheck; concorrência PostgreSQL pendente. |
| DEP-01 | Oito avisos moderados transitivos de desenvolvimento por minimatch. | package.json, package-lock.json | CORRIGIDO com override pontual de typescript-estree para minimatch 11.0.1, sem downgrade do Next. | npm audit final: zero vulnerabilidades, lint/build aprovados. |
| SEO-01 | Sem robots/sitemap e risco de configuração indexar ambiente inadequado. | app/robots.ts, app/sitemap.ts, lib/site-policy.ts, metadados e actions | CORRIGIDO: exige produção, origem HTTPS real, flag explícita e SEO publicado; sitemap usa somente publicações, tags invalidadas. | Política/metadados testados; HTTP bloqueia indexação e sitemap vazio neste ambiente. Domínio/configuração operacional pendentes. |
| A11Y-01 | Hero Home transbordava com texto ampliado em 200%. | features/institutional/institutional.css | CORRIGIDO: limite do título/contenção de decoração, preservando composição. | Antes viewport 768/scrollWidth 895; depois 768/768, sem overflow. |
| PRIV-01 | Busca pessoal em CRM, usuários e participantes de eventos usa query string; histórico e possíveis logs podem reter termos. | features/crm/admin-pages.tsx, administração e participantes | PENDENTE: migrar busca pessoal para POST/estado transitório e revisar proxy/logs. Mitigação: no-referrer/no-store administrativos. ATS já usa POST. | Formulários GET e headers inspecionados; nenhum dado pessoal real enviado. |
| PRIV-02 | Controlador, revisão jurídica e políticas operacionais de retenção/exclusão indefinidos. | /privacidade, scripts de retenção, configuração Careers | PENDENTE OPERACIONAL antes de coleta real. Manter demo; relatórios não excluem dados. | Configuração e bloqueio demonstrativo; aviso não promete conformidade jurídica. |
| FUN-03 | Exportação CSV comercial solicitada anteriormente não implementada. | features/crm, ausência de endpoint comercial CSV | PENDENTE DE IMPLEMENTAÇÃO/HOMOLOGAÇÃO. Não há botão falso; Kanban é expansão opcional. | Inventário de APIs/CRM; CSV de eventos não substitui exportação comercial. |

## Problemas — BAIXO

| ID | Módulo, descrição e impacto | Arquivos | Correção / estado | Evidência |
| --- | --- | --- | --- | --- |
| PERF-01 | Leitura de mídia privada podia repetir busca de sessão/usuário por permissão. | app/api/media/[id]/route.ts | CORRIGIDO: consultar uma vez por pedido, sem cache global de autorização. | Handler e matriz de permissões revisados; GET sem sessão negado. |
| DX-01 | Validação instant de páginas protegidas antigas tratava redirect esperado como erro. | Vinte páginas em app/admin/(protected) | CORRIGIDO: instant=false nas folhas protegidas conforme guia instalado. | Seis rotas em next dev: restritas, zero novos erros instant e zero erros no trecho novo do log. |
| UX-01 | Menu mobile não fechava por Escape nem restaurava foco. | components/layout/public-header.tsx | CORRIGIDO: listener enquanto aberto, foco devolvido ao botão. | Interação real Chrome; aria-expanded=false após Escape. |
| PERF-02 | Opções administrativas carregam coleções completas; imagens institucionais distintas podem gerar consultas por ID; sitemap possui limites. | features/cms/queries.ts, features/institutional, app/sitemap.ts | PENDENTE DE OTIMIZAÇÃO em escala: paginar opções, agrupar imagens, particionar sitemap além de 20 mil entradas dinâmicas. | Revisão de código; banco vazio impede benchmark de volume. Não foi alegada lentidão medida. |
| OPS-01 | Chaves expiradas de RateLimit e arquivos preservados em compensação incerta precisam de revisão operacional. | lib/rate-limit.ts, compensações de upload | PENDENTE: retenção e rotina autorizada de reconciliação/limpeza. | Código inspecionado; nenhuma limpeza em massa executada. |

## Autenticação, permissões, publicação e segurança

Better Auth permanece único; signup administrativo público desabilitado. Hash scrypt com salt exercitado com duas hashes distintas e verificação positiva/negativa. Sessão de oito horas, cookieCache desabilitado; HttpOnly/SameSite=Lax conforme biblioteca instalada, Secure explícito e HTTPS obrigatório em produção. Revogação e proteção do último ADMIN são transacionais; seus testes usam mocks, não sessões reais.

Matriz testa ADMIN ativo/inativo, EDITOR com content:manage, COMERCIAL com requests:manage e concessão explícita de recruitment:manage. Nenhum papel RECRUTADOR adicionado ao enum ou privilégio atribuído a usuários. Só ADMIN altera concessões; operações sensíveis exigem versão atual e sessão recente. Autorização é verificada no servidor. As 21 Server Actions e 39 rotas sem sessão foram restringidas no build real.

Conteúdo rico é estruturado, limitado e renderizado por componentes. Os usos de dangerouslySetInnerHTML encontrados são JSON-LD serializado com escape, não HTML editorial arbitrário. Não foram encontrados queryRawUnsafe/executeRawUnsafe no código de produção, CORS irrestrito ou persistência dos formulários em localStorage. Server Actions usam proteção de origem do Next; APIs públicas/upload têm verificação de origem e guardas próprias.

Catálogos exigem publicação/data independentemente dos filtros. Previews são privados/noindex. Institucional preserva publicação enquanto um rascunho é editado, usa controle de versão e mantém referências de mídia no histórico. Mutações invalidam rotas/tags; sitemap agora participa. Revisão de código e testes locais não substituem o ciclo real rascunho → publicar → editar → despublicar, ainda não homologado.

Headers globais: nosniff, X-Frame-Options DENY e Referrer-Policy; admin/API recebem noindex e no-store; administração usa no-referrer. Não foi imposta uma CSP global incompatível com o Next. CSP com nonce e políticas do proxy exigem avaliação complementar.

## Storage e arquivos

Estado real: URL, chave privilegiada e buckets não configurados; zero buckets e políticas de objetos. Nenhuma alteração de política ou bucket executada; nenhum upload/download privado positivo aprovado.

Código exige buckets privados separados para biblioteca, anexos comerciais e currículos. Downloads passam por autorização; participantes/candidatos e currículos não são listados publicamente. Imagens são verificadas/reencodificadas sem EXIF. PDFs passam por parser em worker limitado e recusa de conteúdo ativo conhecido; isso não é antivírus. Testes usam arquivos sintéticos em memória, sem envio ao Storage.

Antes de habilitar: credencial somente no servidor, políticas sem acesso público indevido e buckets de homologação para testar bytes, permissões, falhas de transporte, exclusão compartilhada e expiração quando aplicável. Não compartilhar acesso público institucional com currículos/anexos privados.

## Verificações executadas

| Verificação | Resultado final | Limite |
| --- | --- | --- |
| npm run lint | APROVADO sem avisos | Análise estática. |
| npm run typecheck e npx tsc --noEmit | APROVADOS | Inclui geração de tipos de rotas. |
| npm test | 62 testes: 57 aprovados, zero falhas, cinco ignorados | Integrações PostgreSQL CMS/CRM/eventos/Careers/institucional sem banco independente. |
| npm run build | APROVADO | 56 páginas geradas; nenhum script alterado para mascarar erros. |
| npx prisma validate | APROVADO | Schema PostgreSQL válido. |
| prisma migrate status, CLI instalada | APROVADO | Quatro migrations, nenhuma pendente; saída sanitizada. |
| prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script | APROVADO, vazio | Comparação sem aplicar; ACL/RLS consultadas separadamente. |
| PostgreSQL/Storage READ ONLY | Conexões/integridade consultadas APROVADAS | 37 RLS, 44 FKs, nove CHECKs, 109 índices, 14 enums; Storage sem buckets. |
| npm audit | Zero vulnerabilidades reportadas, incluindo desenvolvimento | Foto dos advisories da data, não garantia de segurança. |
| HTTP, build de produção | 96 verificações APROVADAS | 16 páginas/filtros; 39 rotas protegidas; cinco recursos privados; sete inexistentes; quatro POSTs recusados; duas respostas auth indisponível; robots/sitemap; 21 Server Actions. |
| npm run audit:browser | 31 cenários APROVADOS; zero exceções JS/escritas tentadas | 24 scans em 12 páginas a 1440/390 px; mais seis layouts em 320/768 px; texto Home em 200%. |
| axe-core 4.14.0 | Zero violações detectadas em 24 scans A/AA selecionados | Não certifica WCAG 2.2 AA; leitor de tela, teclado completo e painel autenticado pendentes de revisão manual. |
| Interações Chrome | Escape do menu e quatro campos inválidos do contato verificados | Nenhum envio positivo efetuado; calendário com eventos reais não exercitado. |
| next dev, seis rotas administrativas | Restrição e diagnóstico APROVADOS | Zero novos erros instant no intervalo consultado. |
| Segredos/configuração Git | Zero correspondências exatas em 52 arquivos client e .env.example | Não é scan de histórico. .env* ignorado, exceto .env.example; .next/gerados ignorados. Git/.git indisponíveis para auditar índice/histórico. |

A primeira execução do navegador encontrou A11Y-01; foi corrigido, recompilado e repetido. Execução final sem falhas; o erro inicial não foi ocultado.

Cobertura local inclui validação de serviços/projetos/artigos, conteúdo rico, ordenação de galeria, URLs, fusos/janelas, elegibilidade/capacidade, CSV de eventos, tokens anti-spam, bytes de imagem/PDF, permissões, guardas de administração, referências institucionais, contratos de concorrência otimista e isolamento de testes. Não comprova concorrência PostgreSQL, upload Supabase, sessão real, editor autenticado ou atualização pública após escrita real.

Artefatos: database-final.json, prisma-metadata-security.json, schema-diff-final.sql, audit-final.json, browser.json, http.json, dev-check.json e secret-scan.json. Contagens comparadas com database-before-http.json.

## Arquivos trabalhados

Não foram alterados .env, prisma.config.ts, schema ou migrations. Gerados em .next/Prisma/tsbuildinfo são artefatos ignorados. Sem Git neste workspace, a relação é de arquivos trabalhados, não um diff de histórico.

- Configuração/documentação: .env.example, package.json, package-lock.json, next.config.ts, README.md, AUDITORIA-GERAL.md.
- Banco/autenticação/política: lib/auth.ts, lib/auth-config.ts, lib/db.ts, lib/site-policy.ts, lib/test-database.ts.
- SEO: app/robots.ts, app/sitemap.ts, app/(public)/[slug]/[entry]/page.tsx, app/(public)/trabalhe-conosco/[slug]/page.tsx, features/cms/metadata.ts, features/institutional/metadata.ts, features/insights/article-utils.ts.
- Portal: components/layout/public-header.tsx, features/institutional/institutional.css.
- Conteúdo: features/cms/actions.ts, rich-text.ts, schema.ts; features/institutional/public-media.ts, queries.ts; features/taxonomy/actions.ts; features/events/actions.ts; features/careers/actions.ts.
- APIs/arquivos: app/api/auth/[...all]/route.ts, app/api/leads/route.ts, app/api/media/route.ts, app/api/media/[id]/route.ts; features/media/validation.ts, compensation.ts; features/crm/attachments.ts.
- Páginas administrativas (page.tsx sob app/admin/(protected)): raiz; [module]; [module]/novo; [module]/[id]/editar e preview; candidaturas e candidaturas/[id]; leads e leads/[id]; eventos, eventos/novo, eventos/[id]/editar, preview e inscricoes, eventos/categorias e palestrantes; vagas, vagas/novo, vagas/[id]/editar e preview. Alteração limitada a instant nas vinte folhas protegidas.
- Testes/ferramentas: scripts/audit-browser.mjs, scripts/careers-prepare-test.ts; tests/audit-security.test.ts, administration-guards.test.ts, db-client.test.ts, site-policy.test.ts, test-database.test.ts, media.test.ts, security.test.ts e as cinco suítes *.integration.test.ts.
- SQL manual autorizado: security/proposals/20261106_prisma_migrations_privileges.sql. Não reaplicar em outro destino sem revisão/autorização.

Dependências: axe-core 4.14.0 explicitado em desenvolvimento para auditoria reproduzível; override transitivo de minimatch para 11.0.1. Nenhum serviço pago adicionado.

## Pendências antes da demonstração completa ou deploy

1. Configurar segredo aleatório/origem Better Auth e criar primeiro ADMIN pelo bootstrap interativo. Produção exige HTTPS; next start em HTTP serve para auditoria pública sem login.
2. Preparar banco/buckets independentes de homologação; confirmar TEST_DATABASE_ISOLATED=true e executar cinco integrações. Testar sessões/login/logout/expiração/revogação, CRUDs positivos, publicação/cache e perfis reais.
3. Homologar arquivos privados/compensações, verificando políticas reais. Manter Careers demonstrativo e sem currículos verdadeiros.
4. Implementar Academy, Documentos e CSV comercial em etapas próprias; revisar/pedir autorização para schema/políticas quando necessário.
5. Corrigir busca pessoal em URLs; definir controlador, revisão de privacidade, retenção, atendimento a titulares e reconciliação de arquivos/backups, sem exclusões em massa automáticas.
6. Somente para domínio real aprovado: SITE_URL HTTPS, SEO institucional autorizado e SITE_INDEXING_ENABLED=true. Não indexar staging/admin/API/previews.
7. Complementar revisão manual de acessibilidade em dispositivos, leitor de tela e painel autenticado; avaliar carga/bundles/consultas com dados isolados.

Referências: [segurança da Data API Supabase](https://supabase.com/docs/guides/api/securing-your-api), [buckets Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals), [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/) e [advisory minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249). Documentação Next consultada em node_modules/next/dist/docs/.

## Etapa 12A — autenticação administrativa

Atualização de 06/11/2026. CFG-01 parcialmente resolvido: configuração pronta; criação da conta e homologação positiva continuam pendentes. As contagens de problemas da Etapa 11 não foram reduzidas por uma configuração parcial.

### Configuração e banco

- DATABASE_URL e DIRECT_URL já estavam presentes; conexão PostgreSQL/Supabase confirmada. Valores e demais variáveis preservados.
- BETTER_AUTH_SECRET gerado localmente com 48 bytes criptograficamente aleatórios (64 caracteres base64url), gravado somente no .env, sem exibição. Não houve rotação de segredo existente.
- BETTER_AUTH_URL já correspondia à origem local http://localhost:3000 e foi preservada.
- .env* segue ignorado, com exceção apenas para .env.example. Não há Git/.git disponível para verificar histórico/índice.
- Quatro migrations existentes aplicadas. Nenhuma migration, reset, alteração de políticas ou deploy nesta etapa.
- Não foi criada conta, sessão autorizada ou marcador de bootstrap no banco principal. A tentativa HTTP com credenciais inexistentes usa apenas a proteção técnica normal de rate limiting; não cria usuário.

### Bootstrap revisado

Comando npm run admin:init preservado. Exige BOOTSTRAP_ADMIN=true, stdin e stdout interativos e configuração de autenticação válida. Nome/e-mail/senha são validados; o e-mail é normalizado, a senha não é impressa e é armazenada com hash scrypt do Better Auth.

A criação permanece transacional, com marcador único contra inicializações simultâneas e dupla verificação de ausência de usuários. Não eleva conta existente nem altera usuários anteriores. O novo Account usa providerId=credential e accountId igual ao ID do usuário desde a criação, conforme a versão instalada do Better Auth. Atribui ADMIN e mantém as concessões limitadas de EDITOR/COMERCIAL. Signup público permanece desabilitado.

Novo npm run auth:configure prepara apenas o ambiente local: gera segredo somente se ausente, mantém valores válidos existentes e recusa duplicatas/configurações inválidas ou arquivos .env de maior prioridade. Não se conecta ao banco nem cria conta. Foi executado para preencher o segredo ausente; demais variáveis conferidas sem exposição de valores.

### Testes desta etapa

- npm run lint, npm run typecheck, npx tsc --noEmit e npm run build: aprovados.
- npm test: 66 testes; 61 aprovados, zero falhas e cinco integrações PostgreSQL ignoradas por falta de banco independente.
- Quatro testes novos: preservação/idempotência do .env, geração criptográfica e recusa de configuração inválida, bootstrap com hash real e atribuição ADMIN usando banco simulado, recusa de usuários existentes/inicialização concorrente/dados inválidos.
- Sete verificações HTTP locais aprovadas: login habilitado; sessão anônima nula; dashboard redirecionado; entrada inválida 400; corpo excessivo 413; credenciais inexistentes 401; sessão continuou anônima após a recusa.
- Permissões, salt/hash e guardas anteriores continuam passando. Esses testes não comprovam persistência do bootstrap no Supabase: o fluxo positivo foi exercitado apenas com repositório simulado.
- Pendente: conta autorizada real, login positivo, persistência/expiração da sessão, dashboard autenticado, logout e recusa de senha incorreta para essa conta. Não foi solicitado compartilhamento de senha e não foi criado usuário de teste no banco principal.
- Evidências locais temporárias: .next/cache/auth12a/http.json e before.json, sem senhas ou valores de configuração.

### Arquivos e operação

Arquivos trabalhados: lib/auth-environment.ts; features/auth/bootstrap.ts; scripts/configure-auth.ts; scripts/bootstrap-admin.ts; tests/auth-setup.test.ts; package.json; README.md; AUDITORIA-GERAL.md; .env local ignorado (somente segredo antes ausente). Nenhuma dependência ou provedor novo.

Procedimento e comandos PowerShell estão na seção Etapa 12A do README. Use npm run dev para HTTP localhost: a proteção de produção continua exigindo HTTPS. O servidor local foi iniciado em localhost:3000 para a verificação; reinicie após qualquer mudança de ambiente. A criação do primeiro ADMIN é responsabilidade da execução interativa explicitamente solicitada, não uma ação automática desta etapa.


### Confirmação de acesso — 07/11/2026

A proprietária confirmou “Conta criada e dashboard aberto” após executar o bootstrap interativo. Consulta READ ONLY verificou um ADMIN ativo, uma conta credential com accountId igual ao ID do usuário, uma sessão administrativa não expirada, um marcador de inicialização e um log de cada operação bootstrap/login. Não foram lidos/exibidos senha, hash, e-mail, token ou identificadores pessoais. A conta foi criada pela proprietária, sem usuário fictício ou senha padrão.

CFG-01 está resolvido. Os totais atuais passam a 17 correções e nove pendências, mantendo os 26 achados originais. Os resultados de 06/11 acima registram a preparação; a pendência de primeiro cadastro foi superada. Nesta verificação passaram 14 testes focados de autenticação/bootstrap/permissões. A proprietária confirmou manutenção da sessão ao atualizar, retorno ao login após sair e proteção de /admin. Consulta READ ONLY posterior confirmou zero sessões totais/ativas e preservação do ADMIN. Esta homologação combina execução manual da proprietária e evidência de banco; não é um teste E2E automatizado. Expiração natural de oito horas e senha incorreta para a conta real não foram testadas nesta interação; a recusa HTTP anterior usou credenciais inexistentes.
