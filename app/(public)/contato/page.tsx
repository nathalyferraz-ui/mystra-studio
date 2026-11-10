import { ContactPage } from "@/features/crm/public-page";
import type { SearchParams } from "@/features/cms/queries";
export const metadata = { title: "Contato — grandes ideias começam com uma conversa", description: "Converse com o Mystra Studio sobre projetos, soluções, parcerias e novas possibilidades digitais." };
export default function Page(props: { searchParams: Promise<SearchParams> }) { return <ContactPage {...props} />; }
