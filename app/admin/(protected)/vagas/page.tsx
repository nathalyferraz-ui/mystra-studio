export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { AdminJobs } from "@/features/careers/admin-pages";
import type { SearchParams } from "@/features/cms/filters";
export default function Page(props: {searchParams:Promise<SearchParams>}) { return <Suspense fallback={<LoadingState />}><AdminJobs {...props} /></Suspense>; }
export const metadata = { title: "Mystra Careers", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
