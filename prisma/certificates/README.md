# CA pública Supabase

Baixe o certificado raiz no painel do projeto demo, Database Settings → SSL Configuration → Download Certificate. Salve-o nesta pasta como `supabase-root-2021.crt`, mantendo o conteúdo original.

Este é um certificado público de autoridade certificadora, **não** uma chave privada. Nunca coloque senhas ou chaves privadas nesta pasta. Não confie em certificados capturados de uma conexão cuja validação falhou.

Execute `npm run demo:tls` para validar a CA e referenciá-la somente nas URLs de .env.demo. O comando mantém sslmode=verify-full e não conecta ao banco. Depois, `npm run demo:check -- --connect` realiza a verificação somente leitura. O .env principal não é modificado.

Origem e procedimento: [Supabase — configuração SSL](https://supabase.com/docs/guides/database/connecting-to-postgres#ssl).
