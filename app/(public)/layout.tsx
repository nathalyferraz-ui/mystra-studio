import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { publishedSettings } from "@/features/institutional/queries";
import { institutionalMetadata } from "@/features/institutional/metadata";
import { isDemoEnvironment } from "@/lib/environment";
import { DemoNotice } from "@/components/demo/notice";
import "@/features/institutional/institutional.css";
import "@/features/demo/demo.css";
async function PublicChrome({ children }: { children: React.ReactNode }) { const settings = await publishedSettings(); return <><PublicHeader settings={settings} />{isDemoEnvironment() && <DemoNotice />}<main id="conteudo">{children}</main><PublicFooter settings={settings} /></>; }
export async function generateMetadata() { return institutionalMetadata(); }
export default function PublicLayout({ children }: { children: React.ReactNode }) { return <Suspense fallback={<LoadingState />}><PublicChrome>{children}</PublicChrome></Suspense>; }
