import Link from "next/link";
import { FlaskConical } from "lucide-react";
export function DemoNotice({ admin = false }: { admin?: boolean }) {
  return <aside className={`demo-notice${admin ? " demo-notice-admin" : ""}`} aria-label="Ambiente de demonstração"><FlaskConical size={15} aria-hidden="true" /><div><strong>Ambiente de demonstração</strong><span>Dados fictícios · {admin ? "exploração somente leitura" : "não recebemos solicitações ou inscrições reais"}</span></div><Link href={admin ? "/admin/demonstracao" : "/demonstracao"}>Sobre esta demo ↗</Link></aside>;
}
