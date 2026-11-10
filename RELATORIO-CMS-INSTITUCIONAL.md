# CMS institucional e administração avançada

## Estado da entrega

Implementado no repositório existente: edição estruturada da Home e O Estúdio, coleções institucionais, configurações publicáveis, navegação e rodapé dinâmicos, gestão de acesso, concessões de perfis e consulta de auditoria. Os layouts editoriais originais foram convertidos em templates controlados, preservando markup, cores, tipografia e animações.

Não foi necessária migration: InstitutionalSetting, AdminLog, Media, User, Role, Permission, UserRole, RolePermission e Session existentes comportam esta etapa. Nenhum schema, usuário, segredo, bucket ou dado comercial foi criado automaticamente. As quatro migrations anteriores permanecem aplicadas.

**Limite de homologação:** o Supabase está conectado, mas BETTER_AUTH_SECRET, primeiro usuário, Storage e TEST_DATABASE_URL independente continuam ausentes. Portanto, os fluxos positivos de login, salvar/publicar pelo navegador, alterações de usuários e uploads não foram homologados. A etapa tem código e verificações locais aprovados; os critérios integrados de aceite ainda dependem dessas configurações.

## Auditoria inicial

- Next 16.4.5, React 19.3, Prisma 7.10.1 com adapter-pg, Better Auth 1.7.17, Zod 4.6.7 e Tailwind 4 preservados. Nenhuma dependência nova.
- PostgreSQL/Supabase acessível; nenhuma migration pendente. RLS confirmada em InstitutionalSetting e AdminLog.
- Home e Sobre utilizavam textos fixos e já possuíam apresentação própria. Header/footer eram estáticos; Usuários e Configurações eram placeholders.
- Better Auth já bloqueava cadastro público, validava contas ativas e registrava login. A autorização existente foi reaproveitada, inclusive CRM e recrutamento privados.
- A biblioteca usa imagens verificadas e bucket privado. O projeto Supabase continua sem buckets/políticas de objetos; não há upload funcional enquanto faltar configuração.
- Academy e Documentos ainda possuem implementações incompletas nesta base. Não foram criados cursos, documentos ou integrações fictícias nesta etapa. A Home mantém o link e o estado de preparação da Academy.
- Não havia seção de depoimentos a converter. Não foram criados depoimentos nem um módulo sem consumo público.

## Rotas administrativas

| Rota | Uso |
| --- | --- |
| /admin/paginas | Páginas, estado, seções e última edição |
| /admin/paginas/home/editar | Editor da Home |
| /admin/paginas/sobre/editar | Editor de O Estúdio |
| /admin/paginas/[id]/preview | Rascunho salvo, autorizado e não indexável |
| /admin/equipe | Perfis conceituais, especialidades, foto e links |
| /admin/parceiros | Parceiros, categoria, logo, destaque e autorização |
| /admin/faq | Perguntas, respostas, categoria, páginas e ordem |
| /admin/configuracoes | Configurações em abas, rascunho e publicação |
| /admin/configuracoes/preview | Prévia privada do header e footer |
| /admin/usuarios | Usuários, filtros, status, perfis e sessões |
| /admin/permissoes | Concessões por perfil, somente ADMIN |
| /admin/logs | Auditoria com filtros e paginação |

A sidebar agrupa Conteúdo, Operações, Institucional e Administração, exibindo módulos conforme autorização. O dashboard contém indicadores institucionais consultados no banco; padrões estruturais não contam como registros publicados.

## Editor e publicação

As oito seções originais de cada página possuem campos controlados de texto e links, imagens da biblioteca e visibilidade. Os templates preservam suas composições. É possível reorganizar seções por botões, remover seções não essenciais e adicionar novamente componentes originais permitidos. O Hero permanece único, visível e na primeira posição.

Seções complementares disponíveis: texto institucional, destaques com ícones permitidos, galeria com legendas, FAQ central, CTA com variantes fixas, conteúdos publicados do CMS, equipe e parceiros. A duplicação é oferecida para essas seções compatíveis; templates originais não são duplicados, preservando IDs e âncoras do layout. Reordenação, exclusão e visibilidade ficam no rascunho até publicação.

Serviços, projetos, artigos e próximos eventos reutilizam consultas e registros existentes. Limites e ordenação são controlados; nenhum conteúdo editorial é copiado para o documento institucional. A imagem institucional global pode alimentar o Hero quando a seção não possui imagem própria.

Salvar mantém o conteúdo publicado anterior. Publicar troca o snapshot público atomicamente, registra autor/data e revalida o layout público. Descartar exige confirmação. Restaurar uma publicação cria novo rascunho versionado. Até dez publicações são preservadas, com comparação de seções/ordem/SEO ou grupos de configuração; não há histórico ilimitado de cada tecla ou autosave.

O editor alerta sobre alterações não salvas, mantém campos após falhas, oferece feedback de validação e não aceita HTML, scripts, CSS ou tipos de componente arbitrários. Os schemas específicos validam campos, limites, variantes, relações de página e URLs. Documentos são limitados a 180 mil caracteres serializados e páginas a 30 seções.

## Persistência e referências de mídia

Os documentos usam chaves reservadas `institutional.v1.home`, `sobre`, `settings`, `equipe`, `parceiros` e `faq` em InstitutionalSetting. Cada envelope contém versão, rascunho, publicação, autor/data, referências de mídia e histórico limitado. Os defaults são os textos institucionais existentes; não são inseridos ao visitar o site.

O primeiro salvamento exige versão zero. As demais operações comparam a versão recebida à versão atual sob lock transacional, inclusive quando duas pessoas tentam inicializar o mesmo documento. Os logs são gravados na mesma transação. Uma edição concorrente não sobrescreve silenciosamente a anterior.

Escritas institucionais e exclusão de mídias compartilham um lock de transação. Imagens devem existir e estar READY. Rascunhos, publicações e versões retidas impedem exclusão do arquivo. Isso substitui a necessidade de criar uma segunda biblioteca de arquivos ou duplicar objetos. Rotacionar o histórico pode liberar referências antigas; não há limpeza automática de arquivos.

O portal seleciona somente `value->'published'`; rascunhos e históricos não são carregados pela consulta pública. Os dados usam `use cache` com tag própria, revalidação em cinco minutos e expiração em uma hora, além de memoização por requisição. As mutações executam `updateTag` para expiração imediata e `revalidatePath` do layout público. Metadados usam essa mesma fonte cacheada. Imagens institucionais publicadas são liberadas pelo proxy existente. Imagens privadas continuam exigindo autorização. Dados de Storage e segredos não são enviados ao cliente.

## Coleções, configurações e identidade

Equipe e parceiros começam vazios. Não há pessoas, clientes, marcas ou relações comerciais geradas. Perfis da equipe são identificados como conceituais; parceiros exigem declaração explícita de autorização. A seção pública só aparece com itens publicados e deve ser adicionada à Home ou Sobre pelo editor.

FAQ reutiliza as quatro perguntas institucionais já existentes em Contato como defaults editáveis, ainda não persistidos. Publicar uma coleção passa a controlar o conteúdo central. As associações alimentam Contato, Soluções, Eventos e a rota atual da Academy; Home/Sobre usam a seção FAQ adicionada no editor. Não há um cadastro duplicado de perguntas por módulo.

Configurações: informações gerais, identidade, redes sociais, SEO, comunicação, navegação e rodapé. Desktop/mobile usam a mesma lista publicada. Links essenciais para Sobre e Privacidade são preservados. O aviso deve identificar empresa fictícia e projeto de portfólio; não há opção para retirar essa identificação. Os tokens de cores continuam fixos. A variante de logo claro fica preparada para contextos claros; o portal atual usa a variante escura/principal.

Os metadados configuráveis ficam no layout do portal público; a administração mantém metadados estáticos e não indexáveis. As novas telas protegidas declaram navegação bloqueante (`instant=false`), pois entrada/redirect depende da validação de sessão. Isso não altera as permissões nem a validação de navegação do portal público. Os parâmetros das telas são lidos sob Suspense. O dev foi reiniciado durante a revisão.

Contatos publicados têm prioridade sobre `contact.channels` e variáveis antigas; sem publicação dessas configurações, o fallback anterior continua funcionando. Canais vazios não são inventados. Configurar e-mails de exibição não ativa envio de mensagens.

O favicon existente foi movido de `app/icon.svg` para `public/icon.svg`, mantendo o endereço público. Isso evita que metadata baseada em arquivo sobreponha o favicon configurado no CMS. Canonical/Open Graph usam SITE_URL válida, sem inventar domínio. A opção de indexação aplica-se em produção; administração e previews continuam não indexáveis.

## Usuários e permissões

- ADMIN mantém acesso integral pelo mecanismo existente.
- `content:manage` continua com sua abrangência legada nos módulos anteriores. Por compatibilidade, permite leitura/edição de páginas e gestão de coleções institucionais, mas não concede publicação institucional automaticamente.
- `pages:read`, `pages:update` e `pages:publish` separam consulta, rascunho e publicação. Um publicador pode publicar o rascunho salvo sem receber direito de editar seu conteúdo.
- `institutional:manage`, `settings:manage`, `users:manage` e `audit:read` controlam os novos módulos.
- `requests:manage` e `recruitment:manage` continuam protegendo operações privadas. EDITOR/COMERCIAL não recebem essas concessões automaticamente.
- Não foi criado perfil RECRUTADOR. Permissões novas só são cadastradas/atribuídas quando um ADMIN salva concessões pela interface; não há seed automático.

Alterar perfis e permissões é exclusivo de ADMIN e exige sessão iniciada há menos de dez minutos. Concessões são por perfil e afetam todos seus membros; a interface exige confirmação e revoga sessões afetadas. Códigos legados desconhecidos são preservados. ADMIN não pode perder seus privilégios pelo formulário de permissões.

Ativar/desativar e revogar sessões exigem `users:manage`, confirmação e sessão recente. Não administradores não alteram contas ADMIN ou perfis. A própria conta não pode ser desativada ou ter perfis trocados por esse fluxo. Um lock serializa alterações de acesso, com nova checagem de autorização dentro da transação e bloqueio à remoção do último administrador recuperável por senha. Versão de usuário/permissões evita alterações com estado antigo.

Convites não foram simulados: falta infraestrutura de e-mail. O primeiro administrador utiliza o comando interativo existente, sem senha embutida. Não há cadastro administrativo público nem interface de edição de variáveis de ambiente.

## Auditoria e verificações

Eventos novos: salvar/publicar/descartar/restaurar conteúdo institucional, alterar acesso, revogar sessões e alterar permissões. Reutilizam AdminLog com IDs e resumo mínimo, sem textos integrais, senhas ou tokens. Login e ações dos módulos anteriores mantêm seus registros. A tela de logs é somente leitura, não exibe metadata arbitrária e protege referências internas de arquivo.

Executado nesta entrega:

- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados.
- `npm test`: 49 testes, 44 aprovados, cinco integrações ignoradas por TEST_DATABASE_URL ausente.
- `prisma validate`: aprovado. `prisma migrate status`: banco atualizado, nenhuma pendência.
- Conexão PostgreSQL real e RLS das duas tabelas reutilizadas confirmadas.
- Chrome: Home e Sobre em 1440, 390 e 320 px, sem transbordamento horizontal, com um H1 e um main; menu mobile funcional e nenhum erro de execução. Screenshots com preferência de movimento reduzido também verificadas.
- HTTP e prévias sem sessão exigem login. POSTs reais às três Server Actions de conteúdo/acesso/permissões redirecionaram ao login e não modificaram documentos, usuários ou concessões (zero antes/depois).
- Páginas de Contato e Careers preservadas nos smoke tests. Nenhum perfil, parceiro, usuário ou publicação foi inserido para apresentar uma demonstração como teste real.

O teste PostgreSQL opcional cobre rascunho/publicação, concorrência, restauração, mídia referenciada, coleções, sessões, permissões e proteção de recuperação em schema temporário de banco independente. Não foi executado. Fixtures de mídia nesse teste são metadados sintéticos, não comprovam upload de Storage.

Não homologados: CRUD autenticado no navegador, fluxo positivo de publicação/revalidação contra banco de testes, alterações reais de usuários/perfis, envio/seleção de arquivos no Storage e testes assistivos completos com leitor de tela. Acesso negado e validação local não substituem esses testes.

## Arquivos e próximos passos

Criados: `features/institutional/` (schemas, defaults, templates Home/Sobre, persistência, consultas, ações, editor, renderer, imagens, metadata, dashboard e comparação de versões); `features/administration/` (catálogo, persistência, ações, controles e telas); onze rotas administrativas; `tests/institutional.test.ts` e `tests/institutional.integration.test.ts`; este relatório.

Alterados: Home/Sobre e suas entradas; layout público e metadata global; header/footer/brand; navegação/sidebar/dashboard; integração de FAQ nas rotas públicas; Contato; proxy, contagem e exclusão de mídias; README. O favicon mantém o mesmo conteúdo/endereço em public. Prisma, configurações Supabase, `.env`, dependências e migrations não foram alterados nesta etapa.

Próximos passos operacionais: configurar Better Auth e o primeiro administrador; preparar Storage privado e banco de testes independente; homologar os ciclos de edição/publicação e acesso com dados sintéticos; revisar política de logs e retenção. Expansões futuras: concluir Academy/Documentos, convites com provedor real e permissões mais específicas nos módulos CMS legados. Não houve deploy.
