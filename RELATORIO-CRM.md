# Mystra Studio — contato, orçamento e CRM

## Estado da entrega

O código está implementado, o Supabase está conectado e a migration comercial foi aplicada após autorização explícita. Os formulários públicos estão habilitados pela presença das tabelas e da chave local de proteção. Não foram inseridos leads fictícios para demonstrar o sistema.

A homologação positiva de envio, acompanhamento autenticado e upload permanece pendente: não há banco de testes separado configurado, a autenticação administrativa ainda precisa do segredo e do primeiro usuário, e o Storage comercial não está configurado. Esta entrega não afirma que esses fluxos passaram por teste integrado.

## Funcionalidades

- `/contato`: hero orbital, cinco finalidades com navegação funcional, formulário único de mensagem, canais institucionais condicionais, FAQ institucional e CTA. Não existia um CMS de FAQ para reutilizar; os textos não prometem prazos ou condições comerciais.
- `/orcamento`: quatro etapas com validação por etapa, campos preservados em memória, revisão e envio. Telefone, projeto, escopo, prazo e ciência do aviso são exigidos; empresa, investimento, serviço e referência visual são opcionais. Não usa localStorage/sessionStorage para dados pessoais.
- Os CTAs individuais de serviço apontam para `/orcamento?servico=<id>`. A seleção usa apenas serviços publicados; o servidor verifica novamente tipo, status e data de publicação sob lock compartilhado. CTAs de contato existentes continuam funcionais, sem redesenhar outras páginas.
- `/admin/leads`: busca por nome/e-mail/empresa; filtros por tipo, status, prioridade, responsável e datas; ordenação estável e paginação de 15 registros; tabela com origem, serviço, responsáveis e datas.
- `/admin/leads/[id]`: dados originais, orçamento, anexos privados, status, prioridade, atribuição, notas internas e atividades reais. Atualizações usam versionamento otimista, transação e AdminLog sem conteúdo pessoal. Um conflito exige recarregar, evitando sobrescrita silenciosa.
- `/admin?comercial=1`: totais reais, status atuais, solicitações por serviço, entradas mensais e cargas atuais por responsável. Filtros de recebimento por período, em UTC. COMERCIAL recebe essa visão ao acessar `/admin`; ADMIN pode alternar entre dashboard editorial e comercial. Não há métricas financeiras estimadas.
- `/privacidade`: aviso técnico com finalidade, dados coletados, armazenamento, ausência de marketing automático e pendências jurídicas/operacionais explícitas.

O Kanban foi reservado para uma expansão após homologar o fluxo básico. A tabela permanece a interface principal. Não há exclusão definitiva pela tela de acompanhamento; arquivar preserva dados e histórico.

## Modelagem e migration

Modelos adicionados: Lead, LeadNote, LeadActivity e LeadAttachment. O orçamento compartilha Lead com tipo ORCAMENTO e campos próprios de projeto, prazo e investimento; não foi criada uma tabela que duplicasse nome, contato, escopo ou serviço.

- Lead → Content (serviço opcional) e User (responsável opcional).
- LeadNote → Lead e User autor.
- LeadActivity → Lead e User opcional; registra recebimento, status, prioridade, responsável e nota adicionada. Conteúdo da nota fica em LeadNote, não duplicado em metadados.
- LeadAttachment → Lead; caminho seguro, nome original sanitizado, MIME e tamanho. Arquivos comerciais não usam a tabela Media nem o bucket editorial.
- Status: NOVO, EM_ANALISE, EM_CONTATO, PROPOSTA_ENVIADA, CONCLUIDO e ARQUIVADO.
- Prioridades: BAIXA, NORMAL, ALTA e URGENTE; o valor inicial é NORMAL, sem urgência inferida.

A migration `20261105010000_commercial_crm` foi gerada por diff e comparada ao banco real antes da aplicação. Foram confirmados o mesmo projeto Supabase nas URLs de runtime e CLI e apenas essa migration pendente. Foi aplicado `prisma migrate deploy`, sem reset e sem qualquer outra migration.

Verificação posterior: quatro tabelas novas, sete chaves estrangeiras, três enums, 14 índices adicionais (18 incluindo PKs) e RLS habilitado nas quatro tabelas, sem políticas públicas. `prisma migrate status` retornou banco atualizado, com duas migrations aplicadas no total. Nenhuma tabela ou dado existente foi removido.

## Segurança do recebimento

- `POST /api/leads` é um Route Handler público de captação; não é um endpoint administrativo de upload irrestrito.
- Como não usa Server Actions, há verificação explícita de Origin contra a origem de BETTER_AUTH_URL (ou a origem da requisição se ausente). Não há CORS liberado para outras origens. As alterações administrativas continuam em Server Action, com proteção Origin/Host do Next e autorização explícita.
- Zod valida todos os campos, limites, ciência do aviso, tipos e finalidade. Um honeypot preenchido é recusado.
- Token HMAC exige espera mínima de dois segundos e expira em duas horas. Formulários expirados exigem atualizar a página, sem persistir dados pessoais no navegador.
- Rate limiting atômico no PostgreSQL reutiliza RateLimit: 200 requisições por minuto globalmente, cinco envios por e-mail em dez minutos. O e-mail é derivado com HMAC na chave; IP e e-mail cru não são gravados no controle de limite. Em produção, complemente com limites no ingress/WAF e monitore o limite global; isso não é uma garantia contra ataques distribuídos.
- A submissão tem chave única e fingerprint com HMAC dos campos e do conteúdo normalizado do anexo. Um lock transacional serializa repetições idênticas entre instâncias. Repetições idênticas em dez minutos não criam outro lead; mensagens diferentes do mesmo e-mail permanecem separadas. Sucesso só ocorre após commit ou confirmação de registro pré-existente.
- O corpo multipart é limitado a 3 MB. Mensagens, notas e revisões são renderizadas como texto React escapado, sem HTML arbitrário.
- Consultas, atualizações e download administrativo verificam sessão ativa e `requests:manage` no servidor. EDITOR não recebe acesso comercial por padrão; COMERCIAL não recebe permissão editorial. RLS não substitui essas verificações, pois o Prisma utiliza a conexão do servidor.
- As páginas comerciais administrativas têm noindex e no-referrer. Não há IDs de leads, e-mails ou mensagens na resposta pública de envio. Logs administrativos registram ações e campos alterados, não o conteúdo das mensagens.

## Configuração local

Foi gerada uma chave aleatória `CRM_FORM_SECRET` somente no `.env` local ignorado pelo Git. Nenhum valor foi exibido. Essa chave não altera BETTER_AUTH_SECRET nem credenciais de banco. Em outras instalações, configure uma chave aleatória com pelo menos 32 caracteres; na ausência dela, o formulário pode usar BETTER_AUTH_SECRET válido. Use a mesma chave entre instâncias e mantenha-a estável. Se nenhuma chave válida ou tabela estiver disponível, o envio é desabilitado e o servidor responde indisponibilidade.

Para o painel: configure BETTER_AUTH_SECRET local com 32+ caracteres, confira BETTER_AUTH_URL e inicialize o primeiro administrador pelo comando interativo documentado no README. Não coloque senhas fixas no código nem compartilhe segredos em mensagens. A inicialização existente atribui `requests:manage` a ADMIN/COMERCIAL e preserva EDITOR com conteúdo.

Canais: configure CONTACT_EMAIL, CONTACT_HOURS e CONTACT_SOCIAL_LINKS (array JSON de objetos com `label` e `url` HTTPS, sem credenciais na URL). Deixe vazios os canais não existentes. Também é possível usar InstitutionalSetting `contact.channels`, com objeto `{ email?, hours?, social: [{ label, url }] }`, através de uma operação administrativa autorizada existente no ambiente; esta etapa não criou uma tela de configurações institucionais. Nenhum canal, perfil, telefone ou endereço foi inventado.

## Anexos e Storage

Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_LEADS_BUCKET exclusivamente no servidor. O bucket comercial deve ser privado, separado de SUPABASE_STORAGE_BUCKET, sem políticas anônimas/autenticadas de leitura, listagem ou upload direto. Nunca use NEXT_PUBLIC para a chave administrativa. Antes de enviar ou baixar, o servidor consulta os metadados do bucket e recusa buckets públicos.

Esta versão aceita somente referências visuais JPEG, PNG e WebP estáticos de até 2 MB. São verificadas extensão, MIME e decodificação real; o pipeline existente limita pixels, remove metadados e reconverte para WebP. PDF, SVG, currículos e documentos arbitrários não são aceitos. Para aceitar documentos no futuro, será necessário definir validação e inspeção próprias; não há antivírus integrado.

O nome do objeto é um UUID gerado no servidor. O download passa por `/api/leads/attachments/[id]`, exige permissão comercial e retorna arquivo com no-store, nosniff e Content-Disposition attachment; não fornece URL pública nem URL assinada reutilizável.

Em falhas/duplicidade, o fluxo tenta remover objetos sem referências confirmadas. Se o resultado da transação estiver incerto e a consulta de referência falhar, preserva o objeto para evitar apagar um anexo comprometido no banco. Não há job de inventário/limpeza programado; revise objetos órfãos operacionalmente antes de qualquer remoção. Upload e limpeza no Storage ainda não foram homologados neste ambiente. Com configuração ausente, o campo fica desabilitado.

## Privacidade, retenção e notificações

O formulário registra a versão do aviso e a data de ciência. Não há consentimento automático de marketing, envio de e-mail, cobrança ou promessa de prazo de resposta. O evento RECEBIDO em LeadActivity fornece um registro durável para uma futura integração de notificações; nenhum provedor pago foi adicionado e não existe worker de e-mail em execução.

Use `npm run crm:retention-report` com CRM_RETENTION_REVIEW_DAYS definido pela operação para contar solicitações arquivadas sem atualização além do período e seus anexos. É somente leitura, não mostra dados pessoais e não define um prazo legal por conta própria. Não há exclusão automática.

Antes de uso comercial: definir controlador e canal real para titulares, base legal, prazos, responsáveis, política de backup e procedimento de verificação de identidade. Pedidos de acesso/correção/exclusão devem passar por fluxo separado, com autorização e revisão de retenção; não basta arquivar. A interface de exclusão definitiva/anônimização e o procedimento de expurgo de arquivos/backups permanecem pendentes. O aviso técnico não é garantia jurídica.

## Testes realizados

- Estado inicial: conexão PostgreSQL confirmada, lint aprovado e 22 testes aprovados/1 ignorado.
- TypeScript, lint e build aprovados após implementação.
- Suíte final: 26 testes aprovados e 2 integrações ignoradas por ausência de TEST_DATABASE_URL.
- Novos testes isolados: validação de contato/orçamento, ciência do aviso, honeypot, token adulterado/futuro/expirado/precoce, enums, filtros e limites de acesso EDITOR/COMERCIAL.
- Teste opcional PostgreSQL preparado para um banco exclusivo: aplica as duas migrations em schema temporário, verifica persistência real, duplicidade concorrente, mensagens distintas do mesmo e-mail, notas, atividades, atribuição, versionamento, limite atômico e RLS. Não foi executado e não valida o login do navegador nem Storage.
- Chrome: contato em 1440, 1024, 768, 390 e 320 px sem overflow horizontal; cinco finalidades reais; escolha de Parcerias refletida no formulário.
- Wizard no navegador: bloqueio por telefone/projeto ausentes, preservação até revisão, bloqueio sem ciência do aviso; nenhum POST gerado pelos testes inválidos.
- HTTP: páginas públicas acessíveis, CRM e downloads exigindo login; origem externa recusada com 403; campos inválidos e token adulterado recusados com 422, sem criar leads.
- Supabase: migration autorizada aplicada, estrutura e RLS consultados, status atualizado. Isso comprova integração e modelagem, não um teste positivo de envio/atendimento.
- Smoke de blog, soluções e portfólio preservado. Capturas locais em `.next/crm-qa/`, fora do versionamento.

Permanecem sem aprovação por teste integrado: envio válido e deduplicação real, CRM autenticado, filtros sobre registros, atualização de status/responsável/notas, histórico com eventos, dashboard preenchido e anexos. Configure TEST_DATABASE_URL em banco independente e autenticação/Storage para homologá-los sem inserir dados fictícios na aplicação.

## Arquivos

Criados: `features/crm/{schema,security,availability,persistence,attachments,queries,actions}.ts`, `features/crm/{public-page,public-form,admin-pages,lead-controls,dashboard}.tsx`, `features/crm/crm.css`; páginas públicas `contato`, `orcamento`, `privacidade`; páginas administrativas `leads` e `leads/[id]`; handlers `api/leads` e `api/leads/attachments/[id]`; `tests/crm.test.ts`, `tests/crm.integration.test.ts`, `scripts/crm-retention-report.ts`; migration comercial e este relatório.

Alterados: `prisma/schema.prisma`, `config/navigation.ts`, `app/admin/(protected)/page.tsx`, `features/services/service-detail.tsx`, `features/public/page-content.ts`, `.env.example`, `.env` local (somente a chave CRM), `package.json` e `README.md`. Cliente Prisma regenerado no diretório já ignorado. Nenhuma dependência adicionada, nenhum deploy realizado.

## Próximas melhorias

Homologação integrada em primeiro lugar; depois Kanban acessível, notificações com entrega real e retries, fluxo protegido para solicitações de titulares e expurgo, revisão de órfãos e observabilidade sem dados pessoais desnecessários. Não há botões simulando essas expansões.
