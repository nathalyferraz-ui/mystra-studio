export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { ContentEditPage } from "@/features/cms/edit-page";
async function Edit({ params, searchParams }: { params: Promise<{ module: string; id: string }>; searchParams: Promise<{ salvo?: string }> }) { const { module: section, id } = await params; const query = await searchParams; return <ContentEditPage section={section} id={id} saved={query.salvo === "1"} />; }
export default function Page(props: { params: Promise<{ module: string; id: string }>; searchParams: Promise<{ salvo?: string }> }) { return <Suspense fallback={<LoadingState />}><Edit {...props} /></Suspense>; }
