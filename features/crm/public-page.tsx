import { faqSchema } from "@/features/institutional/schema";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { ArrowDown, ArrowUpRight, Asterisk, Mail, Orbit } from "lucide-react";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { LoadingState, ButtonLink } from "@/components/ui";
import { crmFormsReady } from "./availability";
import { createFormToken, formSecret } from "./security";
import { leadStorageConfigured } from "./attachments";
import { CommercialForm } from "./public-form";
import { leadTypes } from "./schema";
import "./crm.css";
import { publishedDocuments } from "@/features/institutional/queries";
import { PublishedFAQ } from "@/features/institutional/public-renderer";
import type { SiteSettings } from "@/features/institutional/schema";
import { defaultContactFAQs } from "@/features/institutional/default-faq";
import { isDemoEnvironment } from "@/lib/environment";
import { release } from "@/config/release";
export async function PublicCommercialForm({ quote, searchParams }: { quote: boolean; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection(); const params = await searchParams;
  if (!release.publicIntake) return <div className="notice"><h3>Um projeto de portfólio, aberto a novas conexões.</h3><p>Mystra Studio é um estúdio fictício. Esta versão não recebe solicitações comerciais nem anexos. Utilize os canais públicos disponíveis abaixo para falar sobre o projeto.</p><Link href="/sobre" className="text-link">Conheça o estúdio ↗</Link></div>;
  const enabled = await crmFormsReady(); const secret = formSecret();
  if (isDemoEnvironment()) return <div className="notice"><h3>Contato indisponível nesta demonstração</h3><p>Mystra Studio é um projeto fictício. Não coletamos mensagens, solicitações comerciais ou anexos neste ambiente. Não informe dados pessoais.</p><Link href="/demonstracao" className="text-link">Conhecer os recursos disponíveis ↗</Link></div>;
  let services: { id: string; title: string }[] = [];
  try { if (quote) services = await getDb().content.findMany({ where: { kind: "SERVICE", status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { id: true, title: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] }); } catch { /* Form remains explicit about availability. */ }
  const type = typeof params.assunto === "string" && Object.hasOwn(leadTypes, params.assunto) && params.assunto !== "ORCAMENTO" ? params.assunto : "GERAL";
  return <CommercialForm key={`${type}:${String(params.servico || "")}`} quote={quote} enabled={enabled} token={secret ? createFormToken(secret) : ""} initialType={type} initialService={services.some(s => s.id === params.servico) ? String(params.servico) : ""} services={services} attachments={leadStorageConfigured()} />;
}
async function ContactChannels() {
  await connection();
  const schema = z.object({ email: z.email().optional(), hours: z.string().max(300).optional(), social: z.array(z.object({ label: z.string().min(1).max(60), url: z.url().refine(url => { const u = new URL(url); return u.protocol === "https:" && !u.username && !u.password; }) })).max(10).default([]) });
  let configured: unknown;
  const settings = (await publishedDocuments()).get("settings") as SiteSettings | undefined;
  if (settings) configured = { ...(settings.communication.email || settings.general.email ? { email: settings.communication.email || settings.general.email } : {}), hours: settings.communication.hours || settings.general.hours, social: settings.social.filter(i => i.visible).map(i => ({ label: i.label, url: i.href })) };
  try { if (!settings) configured = (await getDb().institutionalSetting.findUnique({ where: { key: "contact.channels" } }))?.value; } catch { /* Env fallback below. */ }
  if (!configured) { try { configured = { ...(process.env.CONTACT_EMAIL ? { email: process.env.CONTACT_EMAIL } : {}), ...(process.env.CONTACT_HOURS ? { hours: process.env.CONTACT_HOURS } : {}), social: JSON.parse(process.env.CONTACT_SOCIAL_LINKS || "[]") }; } catch { configured = {}; } }
  const parsed = schema.safeParse(configured); const channels = parsed.success ? parsed.data : { social: [] };
  return <section id="canais" className="ms-contact-channels"><span className="eyebrow">OUTROS PONTOS DE CONEXÃO</span><h2>Uma conversa.<br /><span>Novos caminhos.</span></h2>{channels.email && <a href={`mailto:${channels.email}`}><Mail size={20} aria-hidden="true" />{channels.email}</a>}{channels.social.map(item => <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">{item.label}<ArrowUpRight size={16} /></a>)}{channels.hours && <p>{channels.hours}</p>}{settings?.communication.commercialEmail && settings.communication.commercialEmail !== channels.email && <a href={`mailto:${settings.communication.commercialEmail}`}>Contato comercial: {settings.communication.commercialEmail}</a>}{settings?.communication.contactLink && <Link href={settings.communication.contactLink}>Abrir canal de contato ↗</Link>}{!channels.email && !channels.social.length && !channels.hours && !settings?.communication.commercialEmail && !settings?.communication.contactLink && <p>Os canais institucionais serão apresentados quando estiverem disponíveis. Esta versão não coleta mensagens ou dados pessoais.</p>}</section>;
}
const faqs = defaultContactFAQs.map(i => [i.question, i.answer]);
async function ContactFAQBlock() {
  const doc = (await publishedDocuments()).get("faq");
  const parsed = faqSchema.safeParse(doc);
  if (parsed.success && !parsed.data.items.some(i => i.published && i.pages.includes("contato"))) return null;
  return (<section className="ms-contact-faq"><div><span className="eyebrow">03 / ANTES DA CONVERSA</span><h2>Algumas perguntas<br /><span>abrem outras.</span></h2></div><div><Suspense fallback={<LoadingState />}><PublishedFAQ page="contato" fallback={faqs} /></Suspense></div></section>);
}
export function ContactPage({ quote = false, searchParams }: { quote?: boolean; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <div className="ms-contact-page"><header className="container ms-contact-hero"><div className="ms-contact-kicker"><span className="eyebrow"><span className="status-dot" />MYSTRA / {quote ? "UM PROJETO EM PERSPECTIVA" : "PONTOS DE CONEXÃO"}</span><span>IDEIAS ENCONTRAM CAMINHOS.</span></div><div className="ms-contact-heroGrid"><div><h1>{quote ? <>Vamos dar contorno<br />à sua <em>próxima ideia.</em></> : <>Grandes ideias<br />começam com<br /><em>uma conversa.</em></>}</h1><p>{quote ? "Objetivos, possibilidades e expectativas. Reúna o que você já sabe sobre seu projeto e deixe espaço para o que ainda podemos descobrir." : "Entre o que você imagina e o que pode existir, há um primeiro encontro. Compartilhe uma pergunta, uma possibilidade ou o ponto de partida de um projeto."}</p><a href="#conversa" className="text-link">{quote ? "Preparar minha solicitação" : "Encontre seu ponto de partida"}<ArrowDown size={17} aria-hidden="true" /></a></div><div className="ms-contact-orbital" aria-hidden="true"><div /><div /><div /><span className="ms-contact-orbitCore"><Orbit size={78} strokeWidth={.7} /></span><span className="ms-contact-orbitLabel">PESSOAS<br />IDEIAS<br />POSSIBILIDADES</span><Asterisk size={42} strokeWidth={1} /><small>UMA CONEXÃO MUDA A PERSPECTIVA.</small></div></div><div className="ms-contact-disclosure">PROJETO CONCEITUAL DE PORTFÓLIO / MYSTRA STUDIO<span>Design, tecnologia e diálogo.</span></div></header>
    {!quote && release.publicIntake && <section id="assuntos" className="container ms-contact-section"><div className="ms-contact-heading"><span className="eyebrow">01 / ABRIR POSSIBILIDADES</span><h2>O que nos<br /><span>conecta hoje?</span></h2><p>Escolha um ponto de partida. Para projetos, o orçamento reúne os detalhes em uma jornada própria.</p></div><nav className="ms-contact-topics" aria-label="Escolher finalidade do contato">{Object.entries(leadTypes).map(([key, label], index) => <Link href={key === "ORCAMENTO" ? "/orcamento#conversa" : `/contato?assunto=${key}#conversa`} key={key}><span>0{index + 1}</span><strong>{label}</strong><ArrowUpRight size={21} aria-hidden="true" /></Link>)}</nav></section>}
    <section id="conversa" className="container ms-contact-conversation"><aside><span className="eyebrow">{quote ? "DO ESBOÇO AO DIÁLOGO" : "02 / SUA MENSAGEM"}</span><h2>{quote ? <>Cada detalhe<br /><span>abre um caminho.</span></> : <>Uma ideia sua.<br /><span>Um novo começo.</span></>}</h2><p>{release.publicIntake ? "Compartilhe apenas as informações necessárias para compreender sua solicitação. Os dados ficam restritos ao acompanhamento administrativo autorizado." : "Este é um projeto conceitual de portfólio. Para conversar sobre sua construção, utilize somente os canais publicados nesta página."}</p><span className="ms-contact-conversationGlyph" aria-hidden="true">↗</span>{!release.publicIntake ? <Link href="/portfolio" className="text-link">Explorar projetos ↗</Link> : quote ? <Link href="/contato" className="text-link">Prefere uma mensagem geral?</Link> : <Link href="/orcamento" className="text-link">Já tem um projeto em mente? Solicite orçamento ↗</Link>}</aside><div className="ms-contact-formPanel"><Suspense fallback={<LoadingState />}><PublicCommercialForm quote={quote} searchParams={searchParams} /></Suspense></div></section>
    {!quote && <div className="container"><Suspense fallback={<LoadingState />}><ContactChannels /></Suspense>{release.publicIntake && <Suspense fallback={<LoadingState />}><ContactFAQBlock /></Suspense>}</div>}
    <section className="container ms-contact-final"><span className="eyebrow">O PRIMEIRO MOVIMENTO É UMA CONEXÃO.</span><h2>Uma boa pergunta<br /><span>pode mudar tudo.</span></h2><ButtonLink href={release.publicIntake ? "#conversa" : "#canais"}>{!release.publicIntake ? "Ver canais de contato" : quote ? "Apresente seu projeto" : "Compartilhe sua ideia"}</ButtonLink><Asterisk size={120} strokeWidth={.6} aria-hidden="true" /></section></div>;
}
