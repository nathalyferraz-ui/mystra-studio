import { Suspense } from "react";
import { InstitutionalPage } from "@/features/institutional/public-renderer";
import { institutionalMetadata } from "@/features/institutional/metadata";
import { LoadingState } from "@/components/ui";
export async function generateMetadata() { return institutionalMetadata("home"); }
export default function Home() { return <Suspense fallback={<LoadingState />}><InstitutionalPage page="home" /></Suspense>; }
