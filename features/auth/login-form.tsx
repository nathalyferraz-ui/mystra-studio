"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button, Input } from "@/components/ui";
import { loginSchema } from "./login-schema";
export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !configured) return;
    const form = new FormData(event.currentTarget);
    const data = loginSchema.safeParse(Object.fromEntries(form));
    if (!data.success) { setError("Informe um e-mail válido e sua senha."); return; }
    setPending(true); setError("");
    try {
      const result = await authClient.signIn.email(data.data);
      if (result.error) setError(result.error.status === 429 ? "Muitas tentativas. Aguarde um minuto para tentar novamente." : result.error.status >= 500 ? "Acesso temporariamente indisponível. Verifique a configuração do servidor." : "Não foi possível entrar. Verifique suas credenciais e seu acesso.");
      else { router.replace("/admin"); router.refresh(); }
    } catch { setError("Não foi possível conectar ao servidor. Tente novamente."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit}><div className="field"><label htmlFor="email">E-mail</label><Input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="Seu e-mail de acesso" disabled={!configured || pending} /></div><div className="field"><label htmlFor="password">Senha</label><Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={128} placeholder="Sua senha" disabled={!configured || pending} /></div>{error && <p className="form-error" role="alert">{error}</p>}<Button type="submit" disabled={!configured || pending}>{pending ? "Verificando acesso…" : "Entrar no estúdio →"}</Button></form>;
}
