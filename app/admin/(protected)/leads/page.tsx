export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { LeadsPage } from "@/features/crm/admin-pages";
import type { Params } from "@/features/crm/queries";
export const metadata = { title: "CRM — solicitações comerciais", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function Page(props: { searchParams: Promise<Params> }) { return <Suspense fallback={<LoadingState />}><LeadsPage {...props} /></Suspense>; }
