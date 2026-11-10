import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Brand } from "@/components/layout/brand";
import { Badge, LoadingState } from "@/components/ui";
import { LoginForm } from "@/features/auth/login-form";
import { isAuthConfigured } from "@/lib/auth";
import { isDemoEnvironment } from "@/lib/environment";
export const metadata = { title: "Acesso administrativo", robots: { index: false, follow: false } };
async function LoginContent({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await connection();
  const configured = isAuthConfigured();
  const { status } = await searchParams;
  return <div className="login-form"><Badge>{isDemoEnvironment() ? "DEMONSTRAÇÃO / SOMENTE LEITURA" : "ACESSO RESTRITO"}</Badge><h2>Seu espaço de criação.</h2><p>Entre com suas credenciais para acessar o painel administrativo.</p>{!configured ? <p className="form-error" role="status">Acesso indisponível. Configure PostgreSQL, a URL da aplicação e o segredo de autenticação para habilitar o login. Consulte o README.</p> : status === "unavailable" && <p className="form-error" role="alert">Não foi possível verificar a sessão. Confira a conexão e as migrations do banco.</p>}<LoginForm configured={configured} /><p className="login-note">{isDemoEnvironment() ? "Use apenas a conta de demonstração autorizada. Não informe suas credenciais pessoais. Não há cadastro público ou edição por visitantes." : <>O acesso é exclusivo a usuários cadastrados. Não há cadastro público. A inicialização do primeiro administrador é feita por comando local.</>}</p><Link href="/" className="login-back">← Voltar ao portal</Link></div>;
}
export default function LoginPage(props: { searchParams: Promise<{ status?: string }> }) {
  return <main id="conteudo" className="login-page"><div className="login-intro"><Brand /><div><span className="eyebrow">MYSTRA / WORKSPACE</span><h1>Por trás de<br /><span>cada possibilidade.</span></h1><p>Um espaço para organizar ideias e construir o próximo capítulo do estúdio.</p></div><small>Ambiente administrativo · Mystra Studio</small></div><div className="login-form-wrap"><Suspense fallback={<LoadingState />}><LoginContent {...props} /></Suspense></div></main>;
}
