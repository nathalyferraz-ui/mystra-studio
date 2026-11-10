export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { AdminApplicationDetail } from "@/features/careers/admin-pages";
async function Content({params}: {params:Promise<{id:string}>}) { return <AdminApplicationDetail id={(await params).id} />; }
export default function Page(props:{params:Promise<{id:string}>}) { return <Suspense fallback={<LoadingState />}><Content {...props} /></Suspense>; }
export const metadata = { title: "Mystra Careers", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
