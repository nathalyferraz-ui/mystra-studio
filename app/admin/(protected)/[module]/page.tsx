export const instant = false;
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { adminModules } from "@/config/navigation";
import { requireUser } from "@/lib/authorization";
import { hasPermission } from "@/lib/permissions";
import { Badge, EmptyState, LoadingState } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { isCmsModule } from "@/features/cms/config";
import { AdminContentList } from "@/features/cms/admin-list";
import { MediaLibrary } from "@/features/media/page-content";
import { TaxonomyManager } from "@/features/taxonomy/page-content";
import type { SearchParams } from "@/features/cms/queries";
async function ModuleContent({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const { module: slug } = await params;
  const section = adminModules.find(item => item.slug === slug);
  if (!section) notFound();
  if (!hasPermission(user, section.permission)) return <div role="alert"><h1>Acesso restrito</h1><p>Seu perfil não tem permissão para acessar este módulo.</p></div>;
  if (isCmsModule(slug)) return <AdminContentList section={slug} params={await searchParams} />;
  if (slug === "midias") return <MediaLibrary params={await searchParams} />;
  if (slug === "categorias") return <TaxonomyManager />;
  return <><div className="admin-page-heading"><div><span className="eyebrow">GESTÃO DO ESTÚDIO</span><h1>{section.label}</h1><p>Espaço reservado para o gerenciamento de {section.label.toLowerCase()}.</p></div><Badge tone="warning">Próxima etapa</Badge></div><EmptyState title="Uma base pronta para evoluir.">O CRUD deste módulo ainda não está disponível. Nenhuma criação, alteração ou publicação pode ser realizada nesta etapa.</EmptyState><div className="page-back"><Dialog title={`Sobre o módulo ${section.label}`} trigger="O que vem a seguir?"><p>A próxima etapa deste módulo incluirá formulários validados, operações no banco, verificação de permissões no servidor e registros administrativos. Esta tela apresenta apenas sua estrutura inicial.</p></Dialog></div></>;
}
export default function ModulePage(props: { params: Promise<{ module: string }>; searchParams: Promise<SearchParams> }) { return <Suspense fallback={<LoadingState />}><ModuleContent {...props} /></Suspense>; }
