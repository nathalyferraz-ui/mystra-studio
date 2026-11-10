export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { AdminApplications } from "@/features/careers/admin-pages";
export default function Page() { return <Suspense fallback={<LoadingState />}><AdminApplications /></Suspense>; }
export const metadata = { title: "Mystra Careers", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
