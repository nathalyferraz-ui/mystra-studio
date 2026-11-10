export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { AdminEventPreview } from "@/features/events/admin-pages";
async function Content({params}: {params: Promise<{id:string}>}) { return <AdminEventPreview id={(await params).id} />; }
export default function Page(props:{params:Promise<{id:string}>}) { return <Suspense fallback={<LoadingState />}><Content {...props} /></Suspense>; }
export const metadata = { title: "Eventos e workshops", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
