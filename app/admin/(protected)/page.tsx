export const instant = false;
import { Suspense } from "react";
import { AdminDashboard } from "@/features/admin/dashboard";
import { AdminLoadingState } from "@/components/admin/primitives";
import type { SearchParams } from "@/features/cms/filters";
export default function DashboardPage(props: { searchParams: Promise<SearchParams> }) { return <Suspense fallback={<AdminLoadingState />}><AdminDashboard {...props} /></Suspense>; }
