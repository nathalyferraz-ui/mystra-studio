import { publicPathEnabled } from "@/config/release";
import { notFound } from "next/navigation";
import { CareersPage } from "@/features/careers/public-page";
import type { SearchParams } from "@/features/cms/filters";
export const metadata = { title: "Mystra Careers — novas perspectivas", description: "Conheça a proposta conceitual de colaboração e carreiras do Mystra Studio, um projeto fictício de portfólio sem contratações reais." };
export default function Page(props: { searchParams: Promise<SearchParams> }) { if (!publicPathEnabled("/trabalhe-conosco")) notFound(); return <CareersPage {...props} />; }
