# Mystra Admin — redesign

Data: 07/11/2026. Alterações locais de UI/UX. Sem novas migrations, mudanças de schema, deploy, usuários ou registros de negócio criados para testes.

## Diagnóstico inicial

A sidebar tinha 19 módulos com Layers repetido, grupos sem controles e scroll em toda a coluna; o rodapé ainda dizia “Fundação / Etapa 01”. O menu mobile usava details, sem drawer ou gestão explícita de foco. O header não tinha navegação contextual ou busca. O dashboard acumulava dezenas de indicadores de diferentes áreas, incluindo filtros de recrutamento na visão geral. Formulários/listagens tinham estilos variados; a proteção de alterações não salvas do CMS cobria somente o blog.

Foram reutilizados Button, Input, Textarea, Select, Badge, Card, Table, Dialog, paginação, notificações e confirmações existentes. Nenhum editor ou CRUD foi substituído por uma simulação.

## Implementação

- Design system exclusivo do admin: superfícies grafite/roxo, lavanda moderada, bordas e sombras discretas, escala tipográfica, espaçamentos e estados de interação. CSS restrito ao workspace, sem redesign do portal.
- Sidebar de 252 px (230 px no tablet), modo compacto de 72 px, cabeçalho/conta fixos e navegação com rolagem independente discreta.
- Cinco grupos; grupo ativo sempre aberto. Preferências de grupos/modo persistem em mystra.admin.ui.v1, somente booleanos, sem identidade, tokens ou permissões. Se o armazenamento for bloqueado, a interface funciona em memória.
- Ícones Lucide distintos para os 19 módulos, mais Dashboard. Cursos/Documentos são identificados como em preparação, sem links de criação falsos.
- Conta no rodapé com iniciais, nome, perfil, e-mail no popover, preferências de navegação, configurações quando autorizadas e o logout Better Auth existente.
- Header com breadcrumbs de cadastro/edição/detalhes/prévia, acesso ao portal em outra aba e command menu Ctrl+K/Cmd+K.
- Busca limitada aos módulos/atalhos realmente autorizados. Setas, Enter, Escape e foco da caixa de busca funcionais; links preservam a confirmação de alterações não salvas.
- Mobile com dialog nativo em drawer, backdrop, foco contido/restaurado, Escape e fechamento ao navegar.
- Dashboard com quatro indicadores principais reais, saudação/data, seis atalhos conforme autorização, conteúdo recente/não publicado, timeline de AdminLog e resumo por módulo.
- Visões dedicadas: Geral, Eventos, Institucional, Comercial e Recrutamento, conforme permissões. Indicadores anteriores de conteúdo continuam disponíveis em um bloco recolhível. Parâmetros tipo=artigos, comercial=1 e recrutamento=1 preservados.
- Timeline consultada somente com audit:read; não exibe JSON de logs, tokens ou dados comerciais privados.
- Tabelas com cabeçalhos/ações/espaçamento consistentes e região de scroll focável por teclado; filtros responsivos; formulários em seções e coluna contextual.
- Aviso de alterações não salvas estendido a serviços e portfólio. Validações e payloads do servidor preservados.
- Skeletons e error boundary administrativa adicionados, usando retry da versão instalada do Next. Erros não expõem detalhes internos nem afirmam rollback de uma operação incerta.

### Organização da navegação

| Grupo | Módulos |
| --- | --- |
| Visão geral | Dashboard |
| Conteúdo | Páginas, Serviços, Portfólio, Cursos indisponível, Blog, Categorias e tags, Documentos indisponível, Eventos |
| Operações | Vagas, Candidaturas, CRM |
| Institucional | Mídias, Equipe, Parceiros, FAQ |
| Administração | Usuários, Permissões, Logs, Configurações |

Os módulos continuam filtrados no servidor pelas permissões existentes; Permissões permanece exclusivo de ADMIN. As ações de criação seguem verificações do servidor. Preferências visuais não concedem acesso. Para contas com um único grupo autorizado, esse grupo começa descoberto, respeitando a escolha posterior do usuário.

## Verificações e limites

| Verificação | Resultado |
| --- | --- |
| npm run lint | Aprovado, sem avisos |
| npm run typecheck e npx tsc --noEmit | Aprovados |
| npm test | 72 testes: 67 aprovados, cinco integrações PostgreSQL ignoradas por falta de banco independente |
| npm run build | Aprovado |
| Navegação/permissões | Seis testes novos: ícones/indisponíveis, rota ativa única, breadcrumbs, ações permitidas/negadas, preferências sem dados pessoais, busca com acentos e primeiro grupo permitido |
| HTTP real sem sessão | /admin, /admin/servicos, /admin/blog/novo, /admin/eventos, /admin/configuracoes e /admin/usuarios continuam restritos |
| Componentes no Chrome | 15 layouts: dashboard, tabela e formulário em 1440, 1024, 768, 390 e 320 px; zero overflow e zero violações detectadas por axe nos critérios selecionados |
| Interações no Chrome | 17 verificações aprovadas: compacto/persistência, tooltip/foco/Escape, grupos, item ativo em edição, Ctrl+K/busca/Enter, drawer/foco/Escape/navegação, scroll da tabela por teclado e diálogo |
| Execução visual | Zero exceções JavaScript e zero requisições de escrita tentadas |

As primeiras rodadas detectaram um breadcrumb sem nome acessível no tablet e foco incorreto ao abrir a busca; ambos foram corrigidos e a rodada final passou. Também foi corrigida a fonte da prévia para utilizar os arquivos Geist locais.

**Escopo visual:** a proprietária preferiu validar as telas autenticadas em seu navegador habitual. A janela de automação não recebeu uma sessão autenticada; não foram extraídos cookies/tokens nem criada rota de bypass. Os screenshots/testes visuais são de uma prévia isolada dos componentes reais, com estados vazios de teste, navegação Next adaptada e ações de negócio ausentes/desabilitadas. Eles não comprovam renderização autenticada dos dados, CRUDs ou comportamento completo dos editores.

Não foi possível capturar screenshots autenticados de “antes”. O comparativo inicial é de código/estrutura; não foram fabricadas capturas antigas. Em 07/11/2026, a proprietária confirmou no navegador habitual que o redesign apareceu no painel autenticado e que dashboard, recolhimento/expansão da sidebar e navegação por Ctrl+K funcionaram. Esta confirmação manual complementa os testes isolados; não representa homologação de todos os formulários, CRUDs ou fluxos mobile autenticados.

WCAG: axe não certifica conformidade AA. Revisão com leitor de tela, percurso completo por teclado em cada formulário e estados com registros reais permanecem recomendados. As cinco integrações ignoradas não foram contadas como aprovadas.

## Screenshots de componentes — depois

Todas as imagens têm identificação explícita de prévia isolada. Não são capturas de contas ou dados do Supabase.

- [Desktop](docs/admin-redesign/preview-desktop.png), [compacto](docs/admin-redesign/preview-compact.png).
- [Tablet 768](docs/admin-redesign/preview-tablet.png), [mobile 390](docs/admin-redesign/preview-mobile.png), [320 px](docs/admin-redesign/preview-320.png).
- [Drawer](docs/admin-redesign/preview-drawer.png), [busca](docs/admin-redesign/preview-command.png), [formulário](docs/admin-redesign/preview-form.png).
- [Resultados automatizados](docs/admin-redesign/visual-results.json).

## Arquivos trabalhados

- app/admin/(protected)/layout.tsx e page.tsx; novos loading.tsx e error.tsx.
- components/admin/: shell, command-menu, icons, tooltip, primitives, tabs e overview.
- features/admin/: navigation.ts, dashboard.tsx e admin.css.
- features/cms/admin-list.tsx e content-form.tsx; components/ui/index.tsx.
- components/layout/admin-navigation.tsx retirado após conferir ausência de outros consumidores; substituído pela navegação integrada ao novo shell.
- tests/admin-navigation.test.ts.
- scripts/fixtures/admin-preview.tsx; scripts/preview-admin.mjs; scripts/audit-admin-ui.mjs; scripts/lib/admin-browser.mjs e headless-chrome.mjs.
- package.json: comandos de prévia/auditoria; nenhuma nova dependência.
- README.md, REDESIGN-ADMIN.md e docs/admin-redesign/.

## Reproduzir e revisar

No painel real, utilize npm run dev e http://localhost:3000/admin com sua conta. Atualize a página, verifique o modo compacto, grupos, Ctrl+K, listagens, formulários e menu mobile. Não é necessário repetir o bootstrap.

A prévia isolada é uma ferramenta de desenvolvimento, não o painel real:

1. Execute npm run build para preparar as fontes locais.
2. Em um terminal, npm run preview:admin-ui (somente 127.0.0.1:3112).
3. Em outro, npm run audit:admin-ui; requer Chrome local, opcionalmente AUDIT_CHROME_PATH. O comando inicia um perfil headless novo, sem cookies/sessões.
4. POST/PUT/DELETE não são servidos pela prévia; o navegador bloqueia pedidos diferentes de GET/HEAD. Artefatos temporários em .next/cache/admin-redesign.
5. Encerre a prévia após testar.

Autenticação, sessões, Prisma, Supabase, publicação, uploads, logs e configurações de negócio foram preservados. Academy/Documentos continuam incompletos; esta etapa não desenvolve esses módulos. Nenhuma operação positiva de CRUD/upload foi executada no banco principal.
