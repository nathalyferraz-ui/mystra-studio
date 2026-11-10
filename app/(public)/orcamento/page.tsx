import { redirect } from "next/navigation";
import { release } from "@/config/release";
import { ContactPage } from "@/features/crm/public-page";
import type { SearchParams } from "@/features/cms/queries";
export const metadata = { title: "Solicite um orçamento — Mystra Studio", description: "Organize os objetivos e as necessidades do seu projeto digital em uma solicitação de orçamento." };
export default function Page(props: { searchParams: Promise<SearchParams> }) { if (!release.publicIntake) redirect("/contato"); return <ContactPage quote {...props} />; }
