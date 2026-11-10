export const instant = false;
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoadingState } from "@/components/ui";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { isCmsModule, cmsModules } from "@/features/cms/config";
import { contentInclude } from "@/features/cms/queries";
import { ContentDetail } from "@/features/cms/content-detail";
async function Preview({ params }: { params: Promise<{ module: string; id: string }> }) {
  const user = await requireUser();
  if (!hasPermission(user, "content:manage")) return <div role="alert">Seu perfil não permite visualizar prévias.</div>;
  const { module: section, id } = await params;
  if (!isCmsModule(section)) notFound();
  const item = await getDb().content.findUnique({ where: { id, kind: cmsModules[section].kind }, include: contentInclude });
  if (!item) notFound();
  return <><Link className="text-link" href={`/admin/${section}/${id}/editar`}>← Voltar à edição</Link><ContentDetail item={item} section={section} preview /></>;
}
export default function Page(props: { params: Promise<{ module: string; id: string }> }) { return <Suspense fallback={<LoadingState />}><Preview {...props} /></Suspense>; }
