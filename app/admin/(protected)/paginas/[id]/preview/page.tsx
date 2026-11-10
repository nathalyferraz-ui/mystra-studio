export const instant = false;
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { InstitutionalPreview } from "@/features/institutional/admin-pages";

export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
type Props = { params: Promise<{id:string}> };
async function Content({params}: Props) { await connection(); return <InstitutionalPreview id={(await params).id} />; }
export default function Page(props: Props) { return <Suspense fallback={<LoadingState />}><Content {...props} /></Suspense>; }
