"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui";
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return <><Button variant="secondary" disabled={pending} onClick={async () => {
    setPending(true); setError(false);
    try { const result = await authClient.signOut(); if (result.error) throw new Error(); router.replace("/admin/login"); router.refresh(); }
    catch { setError(true); setPending(false); }
  }}>{pending ? "Saindo…" : "Sair da conta"}</Button>{error && <p role="alert">Não foi possível encerrar a sessão. Tente novamente.</p>}</>;
}
