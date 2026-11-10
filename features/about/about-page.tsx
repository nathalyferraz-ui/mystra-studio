import { Suspense } from "react";
import { InstitutionalPage } from "@/features/institutional/public-renderer";
import { LoadingState } from "@/components/ui";
export function AboutPage() { return <Suspense fallback={<LoadingState />}><InstitutionalPage page="sobre" /></Suspense>; }
