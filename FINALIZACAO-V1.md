# Mystra Studio — finalização da versão 1.0

09/11/2026, America/Sao_Paulo. **Candidata à publicação, sem deploy executado.** A prioridade mudou para uma versão pequena usando o Supabase principal e o ADMIN já existente. Trabalho de demo, segundo banco, conta compartilhada e papel PostgreSQL especial suspenso. Nenhum arquivo/configuração demo foi excluído ou usado nesta finalização.

## Plano executado

1. Inventariar código, banco, autenticação e pendências reais, sem escrever no principal.
2. Limitar o portal a Home, Sobre, Serviços, Portfólio e Insights, mantendo contato informativo e privacidade.
3. Verificar lógica de criação/edição/publicação, permissões e cache, com testes em memória; preservar a homologação autenticada como etapa explícita.
4. Preparar build e variáveis da Vercel, documentação GitHub e CI sem credenciais ou deploy automático.

## Diagnóstico real

O principal respondeu a consultas READ ONLY. Há um ADMIN ativo e zero serviços, projetos, artigos, mídias ou documentos institucionais publicados/salvos. Storage permanece sem buckets e sem variáveis completas. Prisma validate passou e migrate status confirmou quatro migrations sincronizadas. A conexão do servidor tem privilégios INSERT/UPDATE nas tabelas necessárias ao CMS; essa constatação foi feita com has_table_privilege, sem executar escrita.

| Funcionalidade | Estado real nesta entrega |
| --- | --- |
| Home e Sobre públicas | Implementadas, padrões estruturais autorais e componentes alimentados por publicações institucionais; nenhum seed necessário |
| Edição institucional | Rascunho/publicação/versão/cache/autorização implementados; validações e testes anteriores preservados; escrita autenticada na interface ainda não homologada |
| Serviços | CRUD real Prisma, listagem, filtros, SEO, publicação, despublicação e preview protegido implementados; repositório testado em memória; banco vazio impede afirmar fluxo público positivo homologado |
| Portfólio | CRUD real, narrativa conceitual, tecnologias e galeria opcional implementados; repositório testado em memória; upload/galeria remotos não homologados |
| Insights | CRUD real, Tiptap/JSON seguro, tags, categorias, SEO e recursos de leitura implementados; repositório testado em memória; fluxo autenticado completo ainda não homologado |
| Better Auth | ADMIN e login/sessão/logout já confirmados pela proprietária anteriormente; bloqueio de rotas sem sessão novamente conferido; login HTTPS Vercel ainda depende do deploy autorizado |
| Categorias, tags e tecnologias | Modelos/operações existentes preservados; sem dados no principal; validações e referências testadas |
| Mídias | Código de validação, upload e autorização existente; bloqueado por ausência de Storage; imagens são opcionais nos CMS essenciais |
| Academy / Documentos | Sem CRUD persistente completo; fora do portal da 1.0 |
| Eventos, CRM, Careers | Código e tabelas preservados; não homologados ponta a ponta; portal/recebimento público desativados no escopo reduzido |
| Usuários, permissões, logs e demais módulos admin | Preservados com controles de acesso existentes; não foram redesenhados/reimplementados ou declarados homologados por esta entrega |

Não foram criadas publicações, contas, dados sintéticos ou arquivos no banco principal. Nenhum valor comercial foi inventado para preencher o portal. Dados vazios não equivalem a homologação de escrita.

## Ajustes implementados

- config/release.ts define o escopo público da 1.0. Header desktop/mobile, footer e links publicados pelo CMS respeitam o filtro sem modificar registros salvos.
- Home mantém identidade e composição original, remove feed de Eventos e filtra cards de módulos adiados, ajustando o grid ao número disponível. Seções opcionais do CMS continuam armazenadas.
- Academy, Eventos e Careers públicos não são entregues nesta versão; retornam o fallback 404. Não foram excluídos seus arquivos, tabelas ou rotas administrativas.
- Sitemap limita-se às rotas da versão e conteúdos publicados dos três CMS essenciais.
- Contato mantém apresentação e canais publicados, sem coletar mensagens ou anexos. Orçamento encaminha a Contato. As três APIs de recebimento público devolvem 403 antes de processar/gravar dados, independentemente de flags anteriores.
- O repositório transacional de Content foi separado da Server Action para testar a lógica real sem acessar o banco principal. As actions continuam exigindo sessão/permissão, validando Zod, tratando conflitos/slug/referências, escrevendo logs e invalidando cache. Não foi criada outra implementação de persistência.
- Validação de publicação exige booleano e versão positiva. Mudanças concorrentes e referências ausentes continuam recusadas.
- Produção possui preflight sem conexão: origem HTTPS, segredo, PostgreSQL com TLS verificado, ausência de bootstrap/testes e contexto normal. Storage é aviso opcional, não bloqueio da versão textual.
- vercel.json usa build:vercel, que valida, gera Prisma e compila, sem migrations/seed. Node 22.x configurado; CA pública opcional entra no rastreamento de arquivos do servidor.
- Auth e indexação em Preview foram desativadas; build Vercel preparado recusa Preview. Documentação orienta cadastrar credenciais somente em Production.
- CI GitHub preparada sem secrets de banco: instalação, lint, tipos, testes e build. Ainda não executada remotamente.
- README simplificado para o escopo real; versão anterior preservada em docs/README-HISTORICO-2026-11-09.md. Relatórios históricos e arquivos demo permanecem disponíveis.

## Verificações

| Verificação | Resultado / limite |
| --- | --- |
| npm test | 94 testes: 89 aprovados, cinco integrações PostgreSQL ignoradas; nenhuma fixture executada no principal |
| Testes novos CMS | Criação, edição, publicação/despublicação, manutenção da data de publicação, conflito de versão, recusa de categoria/mídia ausente e logs transacionais, para os três módulos, usando repositório em memória |
| Testes de release | Navegação incluindo settings salvos, CTAs, caminhos recusados, ausência de intake, gate de produção e recusa de Preview |
| Node 22 | Suíte completa também aprovada: 89 testes passaram e cinco integrações ficaram ignoradas; build completo aprovado com Node 22.23.4 |
| Lint e tipos | Lint aprovado após correções; build executou TypeScript sem erros; npm run typecheck aprovado |
| CI sem banco | Prisma generate e next build aprovados em subprocessos sem credenciais de banco; nenhuma conexão ou migration necessária |
| Dependências de produção | npm audit --omit=dev: zero vulnerabilidades reportadas; isso não comprova ausência absoluta de falhas |
| Prisma | validate aprovado; migrate status atualizado, quatro migrations; nenhuma aplicada nesta etapa |
| HTTP sem sessão | /admin, Serviços, Portfólio, novo artigo e edição institucional redirecionam ao login e mantêm noindex; sem cookie importado ou bypass |
| Rotas adiadas | Academy/Eventos/Careers indisponíveis publicamente; orçamento encaminha ao contato |
| APIs de recebimento | POST vazio não autenticado em leads/eventos/candidaturas: 403 antes de persistir |
| Navegador público | 30 layouts das seis páginas públicas em 1440/1024/768/390/320 px: zero overflow, imagens quebradas, links para módulos adiados, âncoras quebradas, violações axe detectadas, exceções JavaScript ou escritas. Navegação real local com banco vazio; não utiliza sessão administrativa |

Streaming do Next pode entregar HTTP 200 com instrução de redirect/404 no stream; as verificações consideram o destino/fallback e noindex, não apenas o status inicial. Os testes em memória não comprovam PostgreSQL, arquivos Supabase ou operações autenticadas reais.

A primeira rodada visual capturou a Home antes do carregamento inicial e apontou ausência temporária de título/conteúdo. O auditor passou a aguardar o conteúdo e as fontes, e a rodada final foi aprovada. Não foi ocultada uma falha de layout. Capturas sanitizadas e dados ficam em .next/cache/v1, diretório temporário ignorado pelo Git. Axe não certifica conformidade WCAG; revisão manual de teclado/leitor de tela continua recomendada.

## O que ainda falta

**Bloqueios para publicação segura:** definir/configurar domínio HTTPS e variáveis Production; confirmar TLS no runtime Vercel; homologar edição/publicação pela conta da proprietária com conteúdo autoral; revisar o conteúdo público e autorizar o deploy. O banco está vazio, portanto a apresentação editorial ainda precisa ser preenchida pela proprietária. Não será usado seed como atalho.

**Não são pré-requisitos desta versão:** banco demo, conta demo, ambiente complexo de testes, usuário PostgreSQL especial, conclusão de Academy/Documentos, pagamentos, notificações, CRM ou recrutamento. Storage só é necessário se a primeira apresentação incluir arquivos enviados pelo CMS.

Para homologação manual mínima, em localhost:3000/admin: criar conteúdo autoral que deva permanecer, salvar rascunho, verificar indisponibilidade pública, abrir prévia protegida, publicar, conferir slug, editar, conferir atualização, despublicar e conferir retirada. Repetir nos três CMS e publicar uma alteração desejada de Home/Sobre. Não compartilhar senha pelo chat; não criar usuários extras. Nenhum acesso público ao painel será habilitado para recrutadores nesta etapa.

O procedimento e as variáveis estão em [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md). Não há deploy ou push GitHub automático preparado para contornar essa revisão.

Conferência final: .env e .env.demo permaneceram idênticos por checksum. Continuam um usuário e zero conteúdos, leads, inscrições de eventos, candidaturas e mídias no principal. Nenhuma migration, seed, reset, alteração de política ou criação de conta foi executada. O servidor local foi iniciado em http://localhost:3000, usando a configuração principal existente.

## Arquivos principais

config/release.ts; componentes public-header/public-footer; renderer/template Home institucionais; páginas públicas dinâmicas, Eventos/Careers/Orçamento e sitemap; ContactPage e três APIs de recebimento; features/cms/{actions,repository}; lib/{auth-config,site-policy,production-readiness}; scripts/{check-production,audit-v1}; testes cms-repository/release; package.json/package-lock.json/.nvmrc/vercel.json/next.config.ts; CI; README e documentos de finalização/deploy. Não há alterações de schema ou migrations.
