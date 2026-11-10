export const instant = false;
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { ContentEditPage } from "@/features/cms/edit-page";
async function Create({ params }: { params: Promise<{ module: string }> }) { const { module: section } = await params; return <ContentEditPage section={section} />; }
export default function Page(props: { params: Promise<{ module: string }> }) { return <Suspense fallback={<LoadingState />}><Create {...props} /></Suspense>; }
