export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { AdminRegistrations } from "@/features/events/admin-pages";
import type { SearchParams } from "@/features/cms/filters";
async function Content({params,searchParams}: {params:Promise<{id:string}>;searchParams:Promise<SearchParams>}) { return <AdminRegistrations id={(await params).id} searchParams={searchParams} />; }
export default function Page(props:{params:Promise<{id:string}>;searchParams:Promise<SearchParams>}) { return <Suspense fallback={<LoadingState />}><Content {...props} /></Suspense>; }
export const metadata = { title: "Eventos e workshops", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
