export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { AdminEventTaxonomies } from "@/features/events/admin-pages";
export default function Page() { return <Suspense fallback={<LoadingState />}><AdminEventTaxonomies kind="speaker" /></Suspense>; }
export const metadata = { title: "Eventos e workshops", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
