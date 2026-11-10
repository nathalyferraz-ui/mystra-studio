export const instant = false;
import { DemoRecord } from "@/features/demo/explorer";
export default async function Page({ params }: { params: Promise<{ module: string; id: string }> }) { const route = await params; return <DemoRecord section={route.module} id={route.id} />; }
