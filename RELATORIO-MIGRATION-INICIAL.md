# Aplicação autorizada da migration inicial

Data: 05/11/2026. Destino: banco de desenvolvimento do Mystra Studio no Supabase. Nenhuma URL, senha ou chave é incluída neste relatório.

## Escopo e verificações anteriores

A autorização recebida abrangeu somente `20261105000000_postgresql_cms`.

- Confirmado no package.json: `npm run db:deploy` executa `prisma migrate deploy`.
- Confirmado em prisma.config.ts: a CLI usa DIRECT_URL carregada do .env.
- As referências de projeto nas URLs de execução e migrations coincidiram, assim como o nome do banco. As duas conexões estavam acessíveis.
- O histórico local continha uma única migration; `prisma migrate status` confirmou que somente ela estava pendente.
- O schema public não possuía tabelas nem enums antes da aplicação.
- O SQL foi conferido e seu hash foi validado novamente imediatamente antes do comando. Não havia DROP, TRUNCATE, DELETE, UPDATE ou INSERT.

## Execução

`npm run db:deploy` terminou com código zero e informou que a migration autorizada foi aplicada com sucesso. Não foram executados reset, seed, bootstrap de administrador ou outras migrations. A configuração de conexão e o design do site foram preservados.

## Conferência do resultado

| Item | Resultado |
| --- | --- |
| Tabelas de aplicação | 19, todas presentes |
| Colunas | 112, nomes e nulabilidade conferidos contra o SQL |
| Chaves primárias | Presentes e válidas nas 19 tabelas |
| Índices adicionais | 26, nomes, tabelas, colunas, unicidade e validade conferidos |
| Chaves estrangeiras | 17, validadas; origem, destino e ações ON DELETE/ON UPDATE conferidas |
| Enums | Quatro, com valores e ordem iguais aos previstos |
| RLS | Habilitado nas 19 tabelas de aplicação |
| FORCE RLS | Não habilitado, conforme o SQL revisado |
| Políticas de RLS | Nenhuma nas tabelas de aplicação, conforme previsto |
| Histórico Prisma | Uma migration concluída, sem rollback; checksum igual ao arquivo revisado |
| prisma migrate status | Código zero: Database schema is up to date! |
| Cliente Prisma da aplicação | Leituras reais de User, Content, Media e Role aprovadas via DATABASE_URL, todas com contagem zero |
| Dados | Todas as 19 tabelas de aplicação com zero registros após a migration |

As tabelas criadas são User, Session, Account, Verification, Role, Permission, UserRole, RolePermission, AdminLog, InstitutionalSetting, RateLimit, Category, Tag, Technology, Content, Media, ContentMedia, _ContentToTag e _ContentToTechnology. O Prisma mantém adicionalmente sua tabela técnica _prisma_migrations; ela não faz parte da contagem das 19 tabelas de aplicação.

Enums conferidos:

- RoleCode: ADMIN, EDITOR, COMERCIAL.
- ContentKind: SERVICE, PROJECT, ARTICLE.
- PublicationStatus: DRAFT, PUBLISHED.
- MediaState: READY, DELETING.

O RLS sem políticas permite que o servidor opere com uma conta PostgreSQL devidamente autorizada e impede acesso direto por papéis sujeitos a RLS sem política correspondente. A aplicação continua responsável pelas verificações de sessão e permissões; habilitar RLS não substitui essa autorização.

Não houve erro na aplicação da migration nem divergência estrutural na conferência final. A primeira versão do verificador de catálogo recebeu arrays de tipos internos PostgreSQL como strings; a leitura foi corrigida com conversão explícita para text[], repetida sem escrita e sem divergências. Não houve necessidade de alterar tabelas ou reaplicar a migration.

## Pendências para testar o login

1. Configurar no .env um BETTER_AUTH_SECRET aleatório com pelo menos 32 caracteres. Não publicar o segredo.
2. Conferir BETTER_AUTH_URL com a origem usada no navegador e reiniciar o servidor após mudar o ambiente.
3. Criar o primeiro administrador pelo comando interativo controlado do README: BOOTSTRAP_ADMIN temporariamente habilitado e `npm run admin:init`. Nenhum usuário foi criado nesta execução.
4. Testar credenciais corretas/incorretas, sessão, logout e perfis. O banco pronto não significa que o login já foi homologado.

## Pendências para testar uploads

1. Preencher localmente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY com valores reais do projeto. A chave permanece exclusiva do servidor.
2. Criar/selecionar um bucket privado, informar seu nome em SUPABASE_STORAGE_BUCKET e configurar aceitação de image/webp, formato gerado pelo upload de imagens existente.
3. Autenticar um administrador/editor e testar envio em /admin/midias, metadados, acesso a imagens de rascunhos/publicações e exclusão de mídia referenciada.

Nenhum bucket foi criado ou modificado, e nenhum arquivo foi enviado. Upload de documentos, anexos e currículos ainda pertence à implementação da Etapa 3 e exige controles próprios; a biblioteca atual trata imagens.
