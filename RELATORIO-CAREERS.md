# Mystra Careers — implementação e estado real

## Entrega e pendência principal

O código do portal, CRUD de vagas, ATS, arquivos privados, pipeline, notas, histórico, métricas e modo demonstrativo foi implementado no projeto existente. O recebimento público permanece desabilitado por padrão. Nenhuma vaga, candidatura, conta ou currículo demonstrativo foi inserido no banco da aplicação.

A migration `20261105030000_careers_ats` foi **aplicada após autorização explícita**, em 05/11/2026, somente no banco de desenvolvimento Supabase configurado. O pré-check confirmou que DATABASE_URL e DIRECT_URL identificam o mesmo projeto e banco, que `db:deploy` utiliza `prisma migrate deploy`, que os checksums anteriores correspondem aos arquivos e que Careers era a única migration pendente. Não houve reset, remoção de dados nem aplicação de outras migrations. O último `prisma migrate status` confirmou quatro migrations aplicadas e banco atualizado, com saída zero.

A auditoria posterior confirmou as cinco tabelas, 22 índices válidos (17 adicionais e cinco de chave primária), oito chaves estrangeiras validadas, cinco CHECKs e quatro enums com os valores esperados. RLS está habilitada nas cinco tabelas, sem políticas públicas. A permissão `recruitment:manage` foi cadastrada sem nenhuma atribuição; usuários e concessões de papéis permaneceram intactos. As cinco tabelas continuam com zero registros. A integração DATABASE_URL também passou em `npm run db:check`.

Também faltam autenticação administrativa configurada, primeiro administrador, Storage e TEST_DATABASE_URL independente. Não se declara homologação positiva de CRUD, candidaturas, downloads ou exclusão integrada sem essas dependências.

## Rotas

- Públicas: `/trabalhe-conosco`, `/trabalhe-conosco/[slug]`, `/privacidade#careers`.
- Vagas: `/admin/vagas`, `/admin/vagas/novo`, `/admin/vagas/[id]/editar`, `/admin/vagas/[id]/preview`.
- ATS: `/admin/candidaturas`, `/admin/candidaturas/[id]`.
- Dashboard privado: `/admin?recrutamento=1`.
- Recebimento: `POST /api/careers/applications`.
- Download privado: `GET /api/careers/resumes/[id]`, usando identificador de candidatura, sem caminho de Storage na URL.
- PDF sintético controlado: `GET /api/careers/synthetic-resume`, indisponível fora do modo de teste autorizado.

O rodapé recebeu o link Mystra Careers. As páginas anteriores mantêm seus layouts.

## Portal e CMS

O portal tem hero próprio com composição geométrica, cultura conceitual, áreas institucionais, catálogo, processo conceitual, demonstração de formulário e CTA. A identidade deixa explícito que a empresa é fictícia e não realiza contratações reais. Áreas institucionais não são vagas ou registros publicados; não há colaboradores, salários, benefícios ou depoimentos inventados.

O catálogo consulta o PostgreSQL com busca, área, modalidade, nível, situação, ordenação e paginação. A página individual usa somente o cadastro para descrição, responsabilidades, requisitos, diferenciais, benefícios definidos, datas e disponibilidade. Metadados são dinâmicos; páginas de vagas no modo demonstrativo/teste têm noindex e não recebem JobPosting artificial para divulgação como emprego real.

A administração permite criar/editar, salvar rascunho, publicar/despublicar, encerrar, arquivar, duplicar sem candidatos e excluir com título de confirmação somente se não houver candidaturas. As operações validam dados no servidor, slugs únicos, versão atual e integridade. Publicação e edição revalidam o portal. Datas são interpretadas explicitamente em America/Sao_Paulo; o formulário preserva segundos de datas existentes quando o campo não é alterado.

Vagas arquivadas ou em rascunho não são públicas. Encerradas podem continuar visíveis se configurado. Publicação futura e prazo vencido impedem candidatura; o prazo não altera o status salvo por um worker inexistente. Encerrar registra JobActivity e preserva os candidatos. O histórico da candidatura inclui encerramentos reais posteriores ao recebimento.

## Permissões

Better Auth e o RBAC existentes foram preservados. Gestão de vagas utiliza `content:manage`; gestão privada exige `recruitment:manage` ou ADMIN ativo. EDITOR com permissão editorial não recebe acesso automático a candidatos; COMERCIAL também não. O novo perfil RECRUTADOR é opcional no briefing e não foi adicionado ao enum de papéis para evitar modificar usuários e papéis existentes.

A migration apenas cadastra a nova permissão. Não atribui permissões a EDITOR/COMERCIAL, não cria usuários e não eleva ninguém. ADMIN já tem acesso completo pelo mecanismo existente. Qualquer concessão futura a outros papéis deve passar por revisão explícita, considerando que RolePermission afeta todos os integrantes do papel.

As verificações existem em páginas, consultas privadas, Server Actions, download e testes controlados. RLS não substitui autorização, pois o Prisma usa a conexão do servidor. Prévia de vaga não inclui informações de candidatos. Listagem, filtros e paginação do ATS são enviados por Server Action/POST para manter nomes e e-mails fora das URLs; não há persistência de filtros pessoais no navegador. As páginas privadas são noindex/no-referrer.

## Demonstração, teste e recebimento real

`CAREERS_MODE` ausente, `demo` ou desconhecido resulta em demonstração. A API retorna 403/DEMO_MODE antes de ler o corpo, consultar a estrutura de Careers, consumir rate limit, enviar arquivos ou criar registros. A interface não oferece upload/envio; apresenta três campos sintéticos somente leitura. Não utiliza localStorage/sessionStorage para dados de candidatos.

Modo `test` exige ambiente não produtivo, CAREERS_CONTROLLED_TEST=true, retenção definida, chave de formulários, tabelas, Storage privado e o marcador InstitutionalSetting `careers.controlled-test` com `{enabled:true}`. Além disso, o operador precisa estar autenticado e possuir permissão de recrutamento. Somente nomes iniciados por `Teste`, e-mails `@example.test` e PDFs com marcador de assunto sintético são aceitos. O marcador identifica a finalidade do arquivo, não comprova que qualquer conteúdo enviado manualmente seja anônimo; use somente documentos de teste. NODE_ENV=production força demonstração se CAREERS_MODE=test.

Para preparar o marcador, use `npm run careers:prepare-test` com CAREERS_PREPARE_TEST=true e TEST_DATABASE_URL de banco independente, já preparado com migrations revisadas. O comando recusa a origem/banco da aplicação, inclusive referências Supabase equivalentes entre direct/pooler; não aplica migrations, não cria usuários e não insere vagas/candidatos. Depois, execute a instância controlada apontando DATABASE_URL/DIRECT_URL, Better Auth e Storage para o ambiente de testes. Inicialize o administrador de teste pelo fluxo interativo existente e use o PDF sintético autorizado.

Modo `live` exige CAREERS_MODE=live, CAREERS_PRIVACY_REVIEWED=true, CAREERS_SECURITY_REVIEWED=true, CAREERS_CONTROLLER_NAME, CAREERS_PRIVACY_CONTACT_EMAIL válido, CAREERS_RETENTION_DAYS, chave válida e Storage/DB prontos. Isso é uma configuração operacional explícita, não uma certificação jurídica. Antes de qualquer uso real, revise também os textos institucionais, finalidade, controlador, canal e políticas; o projeto atual continua identificado como fictício. Nenhuma dessas flags foi habilitada nesta execução.

## Candidaturas e pipeline

O recebimento valida nome, e-mail normalizado, contato/localidade opcionais, URLs HTTPS sem credenciais, apresentação, aviso, honeypot, assinatura e PDF. A assinatura é derivada da chave de formulários existente com domínio específico de Careers; validade de duas horas e espera mínima de dois segundos. Há comparação explícita de Origin, corpo limitado e rate limiting atômico compartilhado no PostgreSQL (60 tentativas/minuto globalmente e três/e-mail em dez minutos, com e-mail em chave HMAC).

O servidor verifica a vaga antes do upload e novamente sob lock transacional ao criar a candidatura. Publicação válida, estado aberto e prazo são obrigatórios. A unicidade `(jobId,email)` e o CHECK de normalização evitam duplicidade e envios simultâneos; inscrições em vagas distintas não são mescladas por e-mail. O sucesso só ocorre após commit e não afirma envio de e-mail ou contratação.

O pipeline suporta RECEBIDA, EM_ANALISE, TRIAGEM, ENTREVISTA, AVALIACAO_TECNICA, APROVADA, REPROVADA e DESISTENCIA. A tabela tem busca, filtros, ordenação, paginação e distribuição real por etapa. Atualizações exigem versão atual, validam responsável autorizado e gravam notas/atividades na mesma transação. Não há ranking discriminatório nem movimentação visual sem persistência. Kanban ficou reservado para uma expansão após homologação.

## PDFs e Storage

Dependência adicionada: pdf-lib 1.17.1, com suas dependências transitivas. A validação usa extensão, MIME, assinatura, EOF e leitura estruturada. A política inicial recusa arquivos protegidos, formulários, ações conhecidas perigosas, scripts, anexos embutidos e URLs inseguras; limita a 100 páginas, 20 mil objetos e profundidade/quantidade de nós. A leitura ocorre em worker com timeout de cinco segundos, heap V8 limitado e até duas validações simultâneas por processo. O limite V8 não representa uma garantia de limite total para buffers nativos. Não há antivírus/CDR integrado nem promessa de detecção de todo arquivo malicioso.

O tamanho padrão é 5 MB, configurável de 1 a 10 MB. O bucket SUPABASE_CAREERS_BUCKET deve ser privado, separado de mídias e anexos comerciais, sem políticas anônimas/autenticadas de listagem, leitura ou upload direto. O servidor consulta getBucket e recusa bucket público. Caminhos usam UUID gerado no servidor; não são fornecidos pelo candidato ou expostos na resposta pública.

Downloads passam por autorização de recrutamento, bloqueiam exclusões pendentes, registram acesso sem nome/conteúdo do candidato em logs e retornam attachment, no-store, nosniff e CSP sandbox. Não há visualização embutida ou URL pública/reutilizável do currículo.

Se a gravação falhar ou for duplicada, a limpeza verifica que o objeto não possui referência antes de removê-lo. Falhas/incertezas preservam o arquivo para revisão, com tentativa de registro administrativo. Não há job programado de inventário/limpeza; revisar órfãos é uma pendência operacional. Caminhos internos de revisão não são devolvidos ao visitante.

A auditoria de leitura encontrou o schema Storage acessível, zero buckets e zero políticas de objetos neste projeto; as variáveis de Storage também estão ausentes. Portanto, upload/download/limpeza no Supabase não foram homologados. O modo demonstrativo não simula uploads.

## Retenção, exclusão e privacidade

Cada recebimento armazena versão/data de ciência e retentionUntil, calculado com a configuração vigente; mudanças futuras não alteram retroativamente o prazo registrado. O aviso está em `/privacidade#careers`. Não há uso automático em marketing, e-mails, seleção discriminatória ou coleta de atributos pessoais adicionais.

`npm run careers:retention-report` apenas conta registros vencidos e exclusões pendentes; não exibe pessoas, não exclui dados e não define prazo legal. A revisão da operação precisa tratar canal de titulares, identidade, base legal, backups e obrigações aplicáveis.

A exclusão definitiva é separada do acompanhamento: somente ADMIN, sessão iniciada há menos de dez minutos, motivo, ciência da revisão e confirmação digitada do identificador. Retenção só permite exclusão após o prazo; pedidos de titular exigem verificação operacional explícita. A operação primeiro bloqueia a candidatura/download, remove o objeto privado e então exclui registro, notas e atividades, mantendo log mínimo sem conteúdo pessoal. Falhas deixam estado de exclusão pendente para retry autorizado. A mensagem não afirma remoção de backups ou outras cópias.

Esse fluxo não foi executado contra dados reais e não substitui revisão jurídica/operacional.

## Modelos e migration

Job, JobApplication, ApplicationNote, ApplicationActivity e JobActivity. Relações com User existentes para responsáveis, autores e atividades. Currículo fica como referência/metadados privados da candidatura, sem compartilhar Media nem bucket público.

A migration aplicada acrescentou cinco tabelas, quatro enums, 17 índices além das PKs, oito FKs, cinco CHECKs e RLS sem políticas públicas. Não removeu dados, não alterou papéis/contas e não concedeu acesso privado a outros perfis. Há bloqueio referencial contra exclusão de vaga com candidaturas.

Arquivo aplicado: `prisma/migrations/20261105030000_careers_ats/migration.sql`. O checksum registrado pelo Prisma foi comparado ao arquivo após a aplicação. Cliente Prisma regenerado; o servidor de desenvolvimento deste workspace foi reiniciado na implementação para carregar os modelos e preservar o funcionamento dos módulos anteriores.

## Testes e limites de aprovação

- Baseline: PostgreSQL conectado, lint aprovado, 32 testes aprovados e três integrações ignoradas.
- Suíte atual: 39 testes aprovados e quatro integrações ignoradas por TEST_DATABASE_URL ausente.
- Novos testes: default demo/revisões obrigatórias, interface sem envio/upload, isolamento de papéis, publicação/prazo, validação de URLs/privacidade, PDF estático real em memória, MIME/extensão/tamanho inválidos, scripts, arquivo quebrado, limite concorrente de workers e liberação de capacidade.
- Integração PostgreSQL preparada para schema temporário em banco separado: ciclo de vaga, candidatura, concorrência/duplicidade, notas, histórico, versão e preservação. Ela usa metadados de arquivo como fixture e não comprova upload no Storage. Não foi executada.
- Lint, TypeScript, build e Prisma validate aprovados durante a revisão. `npm audit --omit=dev`: zero vulnerabilidades. Permanecem avisos moderados na árvore de desenvolvimento já existente, sem downgrade/force automático.
- Chrome em 1440, 1024, 768, 390 e 320 px: sem overflow horizontal, um H1, três campos somente leitura na demonstração, zero inputs de arquivo e zero botões de submissão demonstrativa.
- HTTP: página pública acessível; slug inexistente com notFound; vagas/ATS/preview/currículos exigem login; PDF sintético retorna 404 fora de teste. POST demonstrativo retorna 403/DEMO_MODE e não cria nem contador de recebimento de Careers (zero antes/depois).
- Smoke de Eventos e Contato preservado. Nenhum dado pessoal foi usado ou inserido para apresentar testes como fluxo real.

Após a aplicação: Prisma validate e migrate status aprovados; conexão de execução aprovada; relatório de retenção retornou zero registros vencidos, zero exclusões pendentes e zero exclusões executadas. A página `/trabalhe-conosco` retornou 200, consultou o banco sem erro e exibiu zero oportunidades e o estado vazio. O slug inexistente acionou notFound; páginas de vagas e candidaturas exigiram login. O POST público continuou retornando 403/DEMO_MODE. O modo público permanece demonstrativo.

Não aprovados por teste integrado: CRUD autenticado, vaga real publicada, candidatura válida persistida, filtros sobre registros, responsável/notas/status no navegador, Storage privado, purga e métricas preenchidas. A estrutura de banco está disponível; esses testes dependem das configurações de autenticação, Storage e ambiente de testes ausentes. Os critérios de aceite integrados permanecem pendentes, sem esconder essa limitação.

## Arquivos e próximos passos

Criados: `features/careers/{config,schema,rules,availability,pdf,storage,repository,queries,actions,private-list-data}.ts`; `features/careers/{public-page,public-detail,application-form,admin-pages,admin-forms,private-list,dashboard,privacy-info}.tsx`; `features/careers/careers.css`; rotas públicas/administrativas e três handlers Careers; migration; dois testes Careers; scripts de revisão de retenção e preparação de ambiente controlado; este relatório.

Alterados: `prisma/schema.prisma` e cliente gerado ignorado; `lib/api-authorization.ts` com helper reutilizável, preservando apiEditor; navegação administrativa, rodapé, dashboard, aviso de privacidade; `.env.example`, `package.json`, `package-lock.json` e README. O `.env` real não foi alterado nesta etapa e nenhum segredo foi versionado.

Próximos passos: configurar autenticação, administrador e banco/Storage de testes; executar a integração e homologação autenticada com dados sintéticos; revisar acessos, retenção e operação de arquivos; somente depois considerar Kanban ou recebimento real. Não houve deploy.

Referência técnica consultada: [API oficial PDF-LIB](https://pdf-lib.js.org/docs/api/classes/pdfdocument) e guias da versão instalada do Next em `node_modules/next/dist/docs/`.
