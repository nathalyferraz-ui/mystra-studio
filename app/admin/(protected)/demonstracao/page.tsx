export const instant = false;
import { DemoAbout } from "@/features/demo/about";
import { requireDemoViewer } from "@/features/demo/access";
export default async function Page() { await requireDemoViewer(); return <DemoAbout />; }
