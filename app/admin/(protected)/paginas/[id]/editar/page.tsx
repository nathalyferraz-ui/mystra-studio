export const instant = false;
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { InstitutionalEdit } from "@/features/institutional/admin-pages";


type Props = { params: Promise<{id:string}> };
async function Content({params}: Props) { await connection(); return <InstitutionalEdit id={(await params).id} />; }
export default function Page(props: Props) { return <Suspense fallback={<LoadingState />}><Content {...props} /></Suspense>; }
