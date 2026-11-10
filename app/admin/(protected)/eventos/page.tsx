export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { AdminEvents } from "@/features/events/admin-pages";
import type { SearchParams } from "@/features/cms/filters";
export default function Page(props: {searchParams: Promise<SearchParams>}) { return <Suspense fallback={<LoadingState />}><AdminEvents {...props} /></Suspense>; }
export const metadata = { title: "Eventos e workshops", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
