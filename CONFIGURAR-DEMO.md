# Configurar mystra-studio-demo com segurança

**Preparação suspensa em 09/11/2026.** Preserve estes arquivos para eventual retomada; não execute os comandos abaixo como parte da versão 1.0. O caminho atual está em FINALIZACAO-V1.md e DEPLOY-VERCEL.md.

Em 07/11/2026 a proprietária informou a criação do segundo projeto Supabase `mystra-studio-demo`. O arquivo local `.env.demo` foi preparado, preservando o `.env` principal. O nome informado não substitui a verificação do identificador e das conexões. As URLs demo ainda estavam vazias na conferência inicial; não foi confirmado acesso ao banco novo.

Atualização após preenchimento: as duas URLs passaram na comparação local de identidade e apontam para o mesmo projeto demo, diferente do principal. Foram acrescentados sslmode=verify-full e removidos parâmetros legados de pooling apenas nas URLs demo, preservando suas credenciais. As duas tentativas de conexão pararam na validação TLS com SELF_SIGNED_CERT_IN_CHAIN, antes de autenticação/SQL. **O acesso real ainda não foi confirmado**: aguarda o certificado oficial do painel Supabase. Nenhuma migration, seed ou criação de conta foi executada.

## 1. Preencher somente o arquivo local .env.demo

No painel do **novo projeto**, abra Connect e copie suas strings PostgreSQL reais. Não use conexões do projeto principal. Não envie senhas ou URLs pelo chat.

| Campo em .env.demo | O que inserir |
| --- | --- |
| DEMO_SUPABASE_PROJECT_REF | Identificador do projeto mystra-studio-demo, visível nas configurações/URL do painel; não é o nome de exibição |
| DEMO_DATABASE_URL | String que corresponderia à DATABASE_URL do novo projeto, para execução |
| DEMO_DIRECT_URL | String que corresponderia à DIRECT_URL do novo projeto, via direct ou session pooler na porta 5432 |
| PRIMARY_SUPABASE_PROJECT_REF | Já preenchido pela leitura segura do .env principal; preserve |
| DEMO_BETTER_AUTH_SECRET | Já gerado aleatoriamente, exclusivo da demo; preserve |
| DEMO_BETTER_AUTH_URL | http://localhost:3001 para desenvolvimento local |

Não insira DATABASE_URL/DIRECT_URL sem prefixo no arquivo demo: o projeto utiliza nomes DEMO_* para impedir fallback acidental. Não modifique o .env principal. Mantenha DEMO_ISOLATED_CONFIRMED=false e DEMO_OPERATION_CONFIRM, DEMO_RESTORE_CONFIRM e DEMO_MIGRATIONS_CONFIRM vazios enquanto o destino aguarda revisão/autorização.

Use TLS (`sslmode=verify-full`, preferido), senha real percent-encoded e banco postgres. A conexão direta normalmente exige IPv6; session pooler é a alternativa IPv4 na porta 5432. Não use transaction pooler 6543 para migrations. Orientação conferida na [documentação Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

No primeiro preflight, DEMO_DATABASE_URL pode conter a string padrão fornecida pelo Supabase. Isso **não libera o servidor web**: a aplicação demo exige posteriormente o papel restrito mystra_demo_app. Depois de autorizar e configurar esse papel, substitua somente DEMO_DATABASE_URL pela conexão própria dele, com sua senha exclusiva. Não altere apenas o nome do usuário esperando que o papel já exista. A conexão proprietária permanece exclusivamente em DEMO_DIRECT_URL para as operações controladas.

## 2. Conferir os destinos sem escrever

```sh
npm run demo:check
```

Este comando lê apenas os arquivos locais, compara as duas identidades demo com a referência declarada, recusa o projeto principal inclusive por aliases direct/pooler, confere a porta de migrations e detecta segredos/origens de autenticação iguais. Não exige ativar as flags operacionais e não altera nenhuma configuração. Imprime apenas a referência demo mascarada e o diagnóstico; não imprime URLs ou senhas.

Depois que o preflight local passar:

```sh
npm run demo:check -- --connect
```

Testa as duas conexões sequencialmente usando BEGIN READ ONLY/ROLLBACK. Consulta somente identidade do banco e histórico de migrations, se existente. Lista apenas nomes de migrations versionadas pendentes. Falhas de TLS, senha ou rede são informadas sem repassar mensagens internas/credenciais. Se o papel restrito ainda não existir, o teste de runtime ficará pendente até sua criação autorizada; o comando não cria o papel.

**Essa verificação não aplica migrations, seed, reset, políticas, permissões ou contas.** A confirmação do destino e a autorização das próximas operações devem ocorrer separadamente.

## 3. Fluxo futuro — comandos apresentados, ainda não autorizados

Se ocorrer SELF_SIGNED_CERT_IN_CHAIN, baixe a CA pública em Database Settings → SSL Configuration → Download Certificate do projeto demo e salve em `prisma/certificates/supabase-root-2021.crt`. Então execute:

```sh
npm run demo:tls
npm run demo:check -- --connect
```

demo:tls valida que o arquivo é uma CA Supabase dentro da validade e referencia seu caminho absoluto somente nas duas URLs demo, mantendo verify-full. Não modifica usuário, senha, host ou banco; não conecta nem concede autorização para escrita. O certificado deve vir do painel oficial, não de uma captura de conexão não confiável. Não use rejectUnauthorized=false, no-verify ou desativação global da validação TLS. A CA é pública e pode ser versionada; senhas e chaves privadas continuam proibidas no repositório. O caminho absoluto permanece apenas no arquivo local ignorado.

Após validar as duas URLs e confirmar o destino demo, a revisão deverá apresentar o SQL e o conjunto exato de migrations pendentes. As quatro migrations locais existentes são:

- 20261105000000_postgresql_cms
- 20261105010000_commercial_crm
- 20261105020000_events_workshops
- 20261105030000_careers_ats

Um projeto vazio receberia todas elas; o estado real ainda precisa ser consultado. O comando migrate deploy aplica todas as pendentes, não somente a primeira.

Somente depois de autorização explícita, definir as confirmações correspondentes no arquivo local e executar, na ordem revisada:

```sh
npm run env:demo -- validate
npm run env:demo -- status
npm run env:demo -- migrate-deploy
npm run demo:prepare
```

Em seguida revisar/autorizar `security/proposals/demo_runtime_role.sql` e configurar o papel restrito, sua senha e DEMO_DATABASE_URL. O SQL não é aplicado automaticamente pelos comandos acima. Depois:

```sh
npm run demo:seed
npm run demo:account
npm run env:demo -- dev
```

O seed persiste apenas os registros sintéticos previstos no projeto separado. A criação da conta é interativa, com e-mail reservado e senha definida pela proprietária, sem criar ADMIN. Retire as confirmações operacionais depois das ações. Não execute restauração nesta preparação.

Para detalhes de cada autorização, privilégios, seed/restauração e testes, consulte [AMBIENTE-DEMO.md](AMBIENTE-DEMO.md). Login demo só poderá ser homologado após essas etapas, em http://localhost:3001/admin/login. O painel principal continua em http://localhost:3000/admin/login.

## Proteção e estado verificado

- .env.demo é coberto por `.env*` no .gitignore, sem exceção para esse arquivo; somente os exemplos vazios são permitidos. Não foi encontrado repositório .git neste diretório, portanto git check-ignore não pôde confirmar o índice. Ao inicializar/conectar o repositório, verifique também que nenhum arquivo secreto já esteja rastreado.
- .env principal permaneceu idêntico, conferido por checksum sem exibir conteúdo.
- Não foram executadas migrations, seed, reset, criação de usuário ou alterações no banco.
- Homologação independente e Storage continuam pendentes; o projeto demo não deve ser usado como banco de testes destrutivos.

Verificações desta preparação: 11 testes direcionados aprovados (incluindo recusa do banco principal, pares divergentes, aliases e portas inválidas), ESLint dos arquivos novos e TypeScript aprovados. O comando demo:check recusou a configuração ainda incompleta antes de conectar. As conexões reais, tabelas e migrations do novo projeto continuam sem validação até o preenchimento das três entradas indicadas. Nenhum teste de integração foi declarado aprovado.

Verificação adicional após preenchimento: 12 testes direcionados aprovados, incluindo aceitação somente do caminho controlado da CA pública e recusa de caminhos arbitrários, travessia de diretórios e parâmetros duplicados. A comparação das URLs foi aprovada; conexão e migrations reais permanecem pendentes de validação TLS.
