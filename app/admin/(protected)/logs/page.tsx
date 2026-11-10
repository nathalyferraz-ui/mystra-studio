export const instant = false;
import { connection } from "next/server";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { AuditPage } from "@/features/administration/pages";
import type { SearchParams } from "@/features/cms/filters";

type Props = { searchParams: Promise<SearchParams> };
async function Content({searchParams}: Props) { await connection(); return <AuditPage params={await searchParams} />; }
export default function Page(props: Props) { return <Suspense fallback={<LoadingState />}><Content {...props} /></Suspense>; }
