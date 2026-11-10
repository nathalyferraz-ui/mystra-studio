export const instant = false;
import { DemoExplorer } from "@/features/demo/explorer";
import type { SearchParams } from "@/features/cms/filters";
export default async function Page({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<SearchParams> }) { const route = await params; return <DemoExplorer section={route.module} params={await searchParams} />; }
