import { notFound } from "next/navigation";
import { isDemoEnvironment } from "@/lib/environment";
import { DemoAbout } from "@/features/demo/about";
export const metadata = { title: "Sobre a demonstração", robots: { index: false, follow: false } };
export default function Page() { if (!isDemoEnvironment()) notFound(); return <div className="container interior-page"><DemoAbout /></div>; }
