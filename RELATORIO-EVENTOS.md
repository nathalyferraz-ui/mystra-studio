# Mystra Studio — Eventos & Workshops

## Entrega e estado real

O módulo foi implementado no projeto existente, com consultas e mutações Prisma reais. A conexão Supabase foi confirmada e a migration foi aplicada após autorização explícita. Nenhum evento, palestrante ou participante demonstrativo foi inserido no banco da aplicação.

A etapa de código e as verificações técnicas estão entregues. A homologação integrada positiva de cadastro, publicação, inscrição, capacidade concorrente e uploads permanece pendente: o ambiente não tem BETTER_AUTH_SECRET válido, usuários administrativos, Storage configurado ou TEST_DATABASE_URL independente. Não se afirma aprovação desses fluxos sem executar as operações reais.

## Auditoria

- Next 16.4.5, React 19.3, Prisma 7.10.1 e Better Auth preservados; PostgreSQL com adapter-pg na aplicação e DIRECT_URL na CLI.
- Antes desta etapa, eventos tinham apenas uma página administrativa reservada. Não havia modelos de cursos, instrutores, eventos ou inscrições acadêmicas para reutilizar.
- Foram reutilizados o design system, Better Auth, `content:manage`, biblioteca de mídias, galeria, seletor de imagens, paginação, alertas de alterações não salvas, assinatura de formulários e RateLimit compartilhado no PostgreSQL.
- As funções de assinatura e limite foram extraídas para `lib/form-security.ts` e `lib/rate-limit.ts`. Os imports anteriores do CRM continuam compatíveis por reexportação; o comportamento comercial foi preservado.

## Portal

`/eventos` possui hero com composição gráfica própria, próximos eventos, calendário mensal, catálogo, manifesto e CTA para programação/Academy. Os filtros consultam título, categoria, modalidade, período, intervalo UTC e ordenação cronológica, com paginação. Categorias vazias não são apresentadas como temas publicados.

O calendário consulta intervalos reais do banco, permite alternar meses e selecionar dias e aceita navegação por setas, Home e End. Eventos de múltiplos dias aparecem em todas as datas locais abrangidas, inclusive atravessando meses. Um término à meia-noite não cria um dia extra. O resumo mensal não repete o mesmo evento para cada dia. Datas e horários informam o fuso IANA cadastrado. Sem registros, não há dias marcados ou eventos fictícios.

`/eventos/[slug]` apresenta capa, resumo, categoria, datas, modalidade, localização, descrição, objetivos, público, temas, programação cronológica, palestrantes visíveis, informações complementares, galeria ampliável, disponibilidade e eventos relacionados. A apresentação omite seções sem conteúdo.

Metadados incluem título/descrição, canonical e imagem quando SITE_URL estiver configurada, Open Graph e JSON-LD Event escapado. Não se inventam URLs de videoconferência. O campo privateAccess e a lista de participantes não fazem parte da projeção pública.

Rascunhos e arquivos são privados. Cancelados permanecem publicamente acessíveis somente se já tinham uma publicação válida, apresentando cancelamento e bloqueando inscrição; cancelar um rascunho não o torna público. Arquivar ou despublicar retira a página pública.

## Administração

- `/admin/eventos`: tabela com busca, categoria, modalidade, estado, ordem, paginação, capa, criação, data e inscritos ativos; calendário administrativo com rascunhos e demais estados, restrito ao editor autorizado.
- `/admin/eventos/novo` e `/admin/eventos/[id]/editar`: proposta completa, datas/fuso, modalidade, capacidade, janela de inscrição, informações públicas/privadas, programação, palestrantes, capa/galeria, destaque e SEO. Validação no cliente e servidor e feedback de falhas de rede preservando os campos.
- `/admin/eventos/[id]/preview`: prévia autenticada com noindex, sem formulário funcional de inscrição e sem dados estruturados públicos.
- Ações: salvar rascunho, publicar, despublicar, cancelar, arquivar, duplicar como novo rascunho sem inscrições e excluir com confirmação apenas quando não houver histórico de inscrições. A duplicação reaproveita referências de mídia, sem copiar arquivos no Storage.
- `/admin/eventos/categorias`: cadastro, edição, descrição e exclusão somente sem vínculos.
- `/admin/eventos/palestrantes`: cadastro, edição, especialidade, biografia, URL profissional HTTPS, foto da biblioteca e visibilidade. Os mesmos palestrantes podem participar de vários eventos. Exclusão de associados é recusada.
- `/admin/eventos/[id]/inscricoes`: busca, filtro de estado, paginação, ocupação, confirmação/cancelamento e últimas dez atividades por inscrição, com responsável e data.
- CSV autorizado em `/api/eventos/[id]/inscricoes.csv`: aplica busca/estado, limita a 10 mil registros por exportação, registra a ação sem conteúdo pessoal em logs, neutraliza fórmulas de planilha e utiliza no-store.

As ações administrativas exigem sessão ativa e `content:manage` no servidor. ADMIN tem acesso completo; EDITOR autorizado gerencia eventos e participantes; COMERCIAL não recebe acesso automático. Consultas não dependem apenas de botões visíveis ou RLS.

## Inscrições

`POST /api/eventos/inscricoes` recebe nome, e-mail normalizado, telefone opcional, evento, ciência do aviso, honeypot e token assinado. O token usa uma assinatura derivada da chave de formulários existente, com domínio específico de eventos; validade de duas horas e espera mínima de dois segundos.

Há comparação explícita de Origin, limite de corpo de 16 KB, validação Zod, 120 tentativas por minuto globalmente e cinco por e-mail em dez minutos. Os limites são atômicos e compartilhados no PostgreSQL. As chaves de e-mail usam HMAC, sem e-mail cru nos controles. Em produção, dimensione limites e proteção no ingress conforme a carga; não se promete proteção absoluta contra ataques distribuídos.

Uma transação bloqueia a linha Event com FOR UPDATE antes de conferir publicação, cancelamento, janela e ocupação. A unicidade `(eventId,email)` e a restrição de e-mail normalizado impedem duplicatas. RECEBIDA e CONFIRMADA ocupam vagas; CANCELADA libera. A reativação administrativa usa o mesmo lock e recusa excesso de capacidade. A edição do evento também usa esse lock e impede reduzir a capacidade abaixo da ocupação atual.

Estados tratados: recebida, já existente, inscrições ainda não abertas/encerradas, lotação, cancelamento, validação e indisponibilidade. O sucesso só é retornado após commit. Repetições não criam uma segunda inscrição e uma inscrição cancelada não é reativada silenciosamente pelo visitante. Não há e-mail de confirmação, pagamento, lista de espera ou geração automática de acesso.

## Banco e migration

Migration aplicada: `20261105020000_events_workshops`, somente após a autorização nesta conversa. O preflight confirmou que runtime e DIRECT_URL apontavam para o mesmo projeto Supabase e que apenas essa migration estava pendente. Não houve reset, remoção de dados ou aplicação de migrations adicionais.

Modelos: Event, EventCategory, Speaker, EventSpeaker, EventScheduleItem, EventMedia, EventRegistration e EventRegistrationActivity.

- Event → categoria e capa opcionais; palestrantes, agenda, galeria e inscrições.
- Speaker → foto opcional, múltiplos eventos e atividades da programação.
- EventRegistration → evento e histórico, com versão para atualização concorrente.
- EventRegistrationActivity → inscrição e operador opcional.
- Registros com inscrições não podem ser apagados pela exclusão de eventos. Arquivamento preserva os participantes.
- Datas do evento, agenda e janela usam TIMESTAMPTZ e fuso IANA separado.
- Enums próprios EventStatus, EventMode e EventRegistrationStatus, sem alterar os enums editoriais existentes.

Auditoria posterior confirmou oito tabelas com RLS, 12 chaves estrangeiras, 15 índices além das oito PKs, quatro CHECKs (datas, capacidade, janela e e-mail normalizado), sem políticas públicas. `prisma migrate status` indicou banco atualizado, com três migrations no total. Não há permissões anônimas criadas pela migration; o acesso público é mediado pelo servidor.

## Integrações e mídias

A Home não tinha seção de eventos. Foi acrescentada uma seção discreta, exibida somente com eventos futuros publicados e destacados. Sem registros, a composição anterior permanece sem cards demonstrativos. O dashboard editorial recebeu totais, publicados, futuros, encerrados, inscrições, abertos, lotados e tabela de ocupação de até oito eventos.

Não foi criada associação artificial com cursos: a revisão atual não possui Course/Instructor no schema. O link `/academia` funciona e os eventos são independentes. Uma relação opcional poderá ser adicionada quando o módulo acadêmico persistente existir.

Uploads reutilizam o handler protegido e o bucket privado da biblioteca editorial, incluindo validação e reconversão de imagens já existentes. O proxy público aceita mídias vinculadas a eventos publicamente visíveis ou a palestrantes visíveis desses eventos. Fotos de palestrantes ocultos não se tornam públicas apenas por existir o cadastro. A exclusão verifica capas, galeria e fotos, inclusive rascunhos, e as FKs preservam a integridade. A contagem de referências na biblioteca foi ampliada.

Supabase Storage continua sem configuração neste ambiente. Seleção e upload têm código real, mas não foram homologados. Não foram criadas referências a arquivos inexistentes para preencher a interface.

## Datas, privacidade e operação

Horários locais são convertidos no servidor conforme IANA. Datas inexistentes e horários ambíguos em transições de horário de verão são recusados. O formulário oferece modo ISO com offset explícito para esses casos e preserva instantes com segundos ao editar. Não depende do fuso do navegador do administrador para interpretar o evento.

O aviso `/privacidade#eventos` informa finalidade, acesso restrito, ausência de marketing automático e versão `eventos-2026-11-v1`. O banco registra essa versão e a data de ciência. A tela administrativa é noindex/no-referrer; participantes não são listados publicamente. URLs privadas de reunião ficam somente no campo administrativo apropriado e não são enviadas automaticamente aos inscritos.

Não há exclusão automática de participantes nem promessa jurídica de conformidade. Configure controlador, canal para titulares, política de retenção e procedimento autorizado de acesso/correção/expurgo antes de uso comercial. O comando `npm run eventos:retention-report`, com EVENT_REGISTRATION_REVIEW_DAYS definido pela operação, conta eventos antigos e inscrições para revisão sem revelar dados pessoais ou excluir registros. Não define um prazo legal por conta própria.

## Verificações e limites

- Baseline: PostgreSQL acessível, lint aprovado e 26 testes aprovados/2 integrações ignoradas.
- Testes isolados finais: 32 aprovados, três integrações ignoradas por TEST_DATABASE_URL ausente. Cobrem fuso/DST, datas inválidas, janelas, capacidade lógica, cancelamento, projeção sem dados privados, filtros sem rascunhos, calendário multidiário, normalização, privacidade e CSV.
- Teste PostgreSQL opcional preparado: aplica as três migrations em schema temporário de um banco independente, publica, disputa vagas concorrentemente, recusa duplicidade, cancela/libera vaga, verifica versão/histórico e preserva inscritos ao arquivar. Não foi executado.
- Chrome: portal em 1440, 1024, 768, 390 e 320 px sem overflow horizontal; calendário real de banco vazio, sem marcações falsas; seleção do dia, foco por setas, navegação para o mês seguinte e busca/modalidade com estado vazio filtrado.
- HTTP: páginas públicas; slug inexistente acionando notFound; listagem, edição, palestrantes, categorias, inscrições, preview e CSV protegidos por login. Com streaming, o Next pode transportar notFound/redirecionamento após iniciar HTTP 200.
- Endpoint: origem externa recusada com 403; campos inválidos recusados com 422; evento inexistente com token válido recusado com 409/CLOSED, sem criar inscrição. Esse caso negativo foi verificado em produção local e no servidor de desenvolvimento após reiniciá-lo.
- Foi encontrado e resolvido o cliente Prisma antigo retido pelo hot reload após gerar novos modelos. A reutilização considera os nomes dos modelos; o processo `next dev` deste workspace foi reiniciado para carregar o cliente transacional atualizado. Após mudar o schema e gerar Prisma em desenvolvimento, reinicie o servidor antes da homologação.
- Lint, TypeScript e build passaram durante a revisão; Prisma e estado da migration foram auditados sem exibir credenciais.

Ainda não aprovados por teste integrado: cadastro/edição/publicação autenticados, inscrição válida persistida, duplicidade e capacidade real sob concorrência, confirmação/cancelamento no painel, conteúdo real no calendário, exportação com registros e uploads. Há zero usuários, eventos, palestrantes e inscrições nesta base. Configure autenticação, administrador, Storage e banco de testes; não use dados demonstrativos no banco da aplicação para mascarar a homologação.

## Arquivos e execução

Criados: `features/events/{schema,time,rules,availability,queries,repository,actions,edit-data}.ts`; `features/events/{events-page,public-catalog,public-detail,event-detail,registration-form,calendar,event-form,row-actions,managers,admin-pages,dashboard}.tsx`; `features/events/events.css`; rotas públicas de eventos; sete páginas administrativas; handlers de inscrição e CSV; migration; `tests/events.test.ts`, `tests/events.integration.test.ts`; `scripts/events-retention-report.ts`; este relatório.

Alterados: schema e cliente Prisma gerado; `lib/db.ts`; `features/crm/security.ts` e `persistence.ts` com reexports das funções compartilhadas; novos `lib/form-security.ts` e `lib/rate-limit.ts`; `features/portfolio/media-picker.tsx` com rótulos parametrizáveis; proteção/contagem de referências de mídias; navegação; Home; dashboard editorial; aviso de privacidade; `.env.example`, `package.json` e `README.md`.

Nenhuma dependência nova ou credencial fixa adicionada. Nenhum deploy realizado. Para iniciar: `npm install`, configurar `.env` conforme README, `npm run db:generate`, verificar migrations e `npm run dev`. Não reaplique manualmente SQL já registrado no banco. Para homologar, configure TEST_DATABASE_URL em banco separado e execute `npm test` antes do fluxo autenticado no navegador.
