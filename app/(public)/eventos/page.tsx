import { publicPathEnabled } from "@/config/release";
import { notFound } from "next/navigation";
import { EventsPage } from "@/features/events/events-page";
import type { SearchParams } from "@/features/cms/filters";
import { Suspense } from "react";
import { InstitutionalFAQSlot } from "@/features/institutional/public-renderer";
export const metadata = { title: "Eventos & Workshops — conexões em movimento", description: "Explore encontros, workshops e experiências de troca sobre tecnologia, design e criatividade no Mystra Studio." };
export default function Page(props: { searchParams: Promise<SearchParams> }) { if (!publicPathEnabled("/eventos")) notFound(); return <><EventsPage {...props} /><Suspense fallback={null}><InstitutionalFAQSlot page="eventos" /></Suspense></>; }
