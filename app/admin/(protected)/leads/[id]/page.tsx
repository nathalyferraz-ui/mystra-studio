export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { LeadDetailPage } from "@/features/crm/admin-pages";
export const metadata = { title: "Acompanhamento comercial", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function Page(props: { params: Promise<{ id: string }> }) { return <Suspense fallback={<LoadingState />}><LeadDetailPage {...props} /></Suspense>; }
