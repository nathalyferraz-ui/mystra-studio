# Mystra Studio

Portal e CMS autorais de um estúdio **inteiramente fictício**, desenvolvidos como projeto de portfólio. A candidata à versão 1.0 prioriza Home, O Estúdio, Soluções, Portfólio e Insights, com gerenciamento administrativo protegido.

**Estado em 09/11/2026:** preparação para publicação; nenhum deploy executado. Leia [FINALIZACAO-V1.md](FINALIZACAO-V1.md) para os resultados e limites atuais e [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md) para publicar com segurança. A preparação do segundo banco e da conta demo foi suspensa; seus arquivos foram preservados e não são necessários para esta versão.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Prisma 7 com driver PostgreSQL, Supabase e Better Auth. Editor estruturado Tiptap, validação Zod e ícones Lucide. Node.js **22.x** definido em package.json/.nvmrc para coincidir com a Vercel e a CI.

## Escopo da primeira versão

- `/`: identidade visual original e destaques reais do CMS; sem registros inventados.
- `/sobre`: apresentação institucional, alimentada pelo editor de páginas.
- `/servicos` e `/servicos/[slug]`: catálogo, busca, filtros e serviços publicados.
- `/portfolio` e `/portfolio/[slug]`: projetos, estudos conceituais e tecnologias.
- `/blog` e `/blog/[slug]`: artigos, categorias, tags, leitura e SEO.
- `/contato`: apresentação e canais configurados, **sem coleta de mensagens, orçamentos ou anexos**.
- `/privacidade`: aviso técnico; não equivale a certificação jurídica.
- `/admin/login` e `/admin`: autenticação real, sessões, permissões e dashboard.
- `/admin/servicos`, `/admin/portfolio`, `/admin/blog`, `/admin/categorias`, `/admin/paginas`, `/admin/configuracoes`: edição e publicação pelo CMS existente.

Academia, Eventos, Documentos, Carreiras e inscrições ficam fora da publicação pública da 1.0. Links salvos no CMS também são filtrados na apresentação. `/orcamento` encaminha a `/contato`. Código, tabelas e módulos administrativos anteriores permanecem preservados; não há remoção de dados. Configurações institucionais têm precedência sobre os padrões estruturais somente após publicação.

## Executar localmente

Use Node 22.x. Se já existe um `.env` configurado, **preserve-o**. Em um checkout novo, copie `.env.example` para `.env` e preencha os valores no editor local, nunca em mensagens ou commits.

```sh
npm ci
npm run dev
```

Abra http://localhost:3000. `postinstall` gera o cliente Prisma; não aplica migrations ou seed. O portal trata ausência de registros e indisponibilidade das consultas sem substituir o CMS por exemplos comerciais. Login depende da conexão e da configuração válida do ambiente.

| Variável | Uso |
| --- | --- |
| DATABASE_URL | PostgreSQL de execução; Supabase pooler recomendado na Vercel |
| DIRECT_URL | CLI/migrations manuais; direct ou session pooler 5432 |
| BETTER_AUTH_SECRET | Segredo forte de autenticação, somente servidor |
| BETTER_AUTH_URL | Origem exata; http://localhost:3000 local, HTTPS na publicação |
| SITE_URL | Origem HTTPS pública, igual à origem de autenticação na produção |
| SITE_INDEXING_ENABLED | false inicialmente; liberar somente após revisão do conteúdo |
| MYSTRA_ENV | development local, production na Vercel; não usar demo |
| SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_STORAGE_BUCKET | Opcionais para imagens; bucket privado e chave somente no servidor |

Não use NEXT_PUBLIC_ para credenciais. Nunca publique .env, .env.demo, URLs completas, senhas, hashes, tokens, currículos ou anexos privados. O .gitignore permite apenas exemplos sem segredos. Valores e certificados usados na Vercel são configurados privadamente conforme o guia de deploy; não copie caminhos absolutos do Windows.

## Acesso administrativo e conteúdo

O primeiro ADMIN já foi criado pela proprietária no banco atual. **Não execute bootstrap novamente nesse banco.** Entre com sua conta em http://localhost:3000/admin/login. Não há cadastro público nem conta compartilhada para visitantes.

Em uma instalação nova, sem usuários e com banco/migrations previamente revisados e autorizados, o bootstrap existente é `npm run admin:init`, exigindo BOOTSTRAP_ADMIN=true somente durante a execução interativa. Nunca habilite essa variável no servidor publicado. Não existe senha padrão.

Para cada módulo essencial: crie seu conteúdo autoral, salve rascunho, confira a prévia autenticada, publique e abra o slug público. Edite e despublique para conferir o ciclo completo. O servidor valida sessão, permissão, dados, referências e versão; alterações invalidam o cache público. Capas e galeria são opcionais: sem Storage, use os estados visuais existentes e conteúdo textual. Não invente clientes ou resultados e identifique projetos conceituais.

## Verificações

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run db:validate
npx prisma migrate status
```

Os testes unitários e de repositório em memória não gravam no banco principal. As integrações PostgreSQL ficam ignoradas sem TEST_DATABASE_URL independente; esse banco adicional **não é requisito para publicar a versão reduzida**. Não execute fixtures, seed ou testes destrutivos no projeto principal. A homologação de escrita pela interface com conteúdo real da proprietária permanece explicitamente separada dos testes em memória.

`npm run audit:v1` verifica as páginas públicas no navegador local, em cinco larguras, com escrita bloqueada. Requer o servidor em localhost:3000 e Chrome disponível. Não substitui teste autenticado de CRUD nem certificação WCAG.

## Publicação

```sh
npm run release:check
```

Esse comando somente confere configuração, sem conectar ou modificar o banco. A configuração local HTTP não deve passar como produção. O build Vercel preparado é `npm run build:vercel`: valida ambiente, gera Prisma e compila Next, **sem migrations ou seed automáticos**. Credenciais principais devem ser cadastradas exclusivamente no escopo Production. Builds Preview com esse fluxo são bloqueados, e autenticação/indexação em Preview permanecem desativadas.

O deploy ainda depende da origem pública definitiva, variáveis HTTPS/TLS na Vercel, homologação do conteúdo e autorização da proprietária. Storage, segundo banco, usuário PostgreSQL demo e novos módulos não são condições desta primeira publicação. Veja a lista objetiva em [DEPLOY-VERCEL.md](DEPLOY-VERCEL.md).

## Documentação

- [Finalização 1.0](FINALIZACAO-V1.md): inventário, alterações, verificações e pendências.
- [Deploy Vercel](DEPLOY-VERCEL.md): variáveis, TLS, GitHub e sequência de publicação.
- [Auditoria geral](AUDITORIA-GERAL.md) e [redesign administrativo](REDESIGN-ADMIN.md): histórico técnico, com limitações de cada etapa.
- [README anterior preservado](docs/README-HISTORICO-2026-11-09.md): detalhes históricos dos módulos; não define o escopo atual.
- AMBIENTE-DEMO.md e CONFIGURAR-DEMO.md: preparação suspensa, arquivos preservados para eventual retomada.