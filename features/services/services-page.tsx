import Link from "next/link";
import { Suspense } from "react";
import { ArrowDown, ArrowUpRight, Asterisk, Braces, Compass, Focus, Lightbulb, Orbit, ScanLine } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import type { SearchParams } from "@/features/cms/queries";
import { CatalogLoading, ServicesCatalog } from "./catalog";
import "./services.css";

const approach = [
  { title: "Descoberta", text: "Antes de propor, compreender. Contexto, necessidades e perguntas dão início ao caminho.", icon: ScanLine },
  { title: "Estratégia", text: "Organizar possibilidades, conectar objetivos e definir o que merece atenção primeiro.", icon: Compass },
  { title: "Design", text: "Traduzir a direção em linguagem, fluxos e interfaces com clareza e personalidade.", icon: Focus },
  { title: "Desenvolvimento", text: "Dar estrutura à experiência com código, integrações e atenção ao funcionamento.", icon: Braces },
  { title: "Evolução", text: "Observar, aprender e refinar. Uma solução digital também precisa de espaço para mudar.", icon: Orbit },
];

export function ServicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <div className="ms-solutions-page">
      <section className="container ms-solutions-hero" aria-labelledby="solutions-title">
        <div className="ms-solutions-heroTop"><span className="eyebrow"><span className="status-dot" /> SOLUÇÕES / MYSTRA STUDIO</span><span className="ms-solutions-micro">DO QUE VOCÊ IMAGINA AO QUE PODE EXISTIR.</span></div>
        <div className="ms-solutions-heroCopy"><span className="ms-solutions-smallLabel">ESTRATÉGIA + DESIGN + TECNOLOGIA</span><h1 id="solutions-title">Ideias extraordinárias.<br /><span>Soluções à altura.</span></h1><p>Uma boa ideia abre possibilidades. Nosso universo conecta pensamento criativo e construção digital para dar direção, forma e estrutura ao próximo passo.</p><a href="#catalogo" className="button button-primary">Explore as soluções <ArrowDown size={17} aria-hidden="true" /></a></div>
        <div className="ms-solutions-diagram" aria-hidden="true"><span className="ms-solutions-diagramCaption">UMA IDEIA. DIFERENTES CAMINHOS.</span><div className="ms-solutions-diagramTrack" /><div className="ms-solutions-diagramNode"><Lightbulb size={26} strokeWidth={1} /><span>INTENÇÃO</span><strong>O ponto de partida.</strong></div><div className="ms-solutions-diagramCore"><div /><Asterisk size={90} strokeWidth={1} /><span>CONEXÕES QUE DÃO FORMA</span></div><div className="ms-solutions-diagramNode"><Braces size={26} strokeWidth={1} /><span>CONSTRUÇÃO</span><strong>A ideia em movimento.</strong></div><span className="ms-solutions-diagramSpark">✦</span></div>
      </section>

      <section className="container ms-solutions-intro ms-solutions-section" aria-labelledby="solutions-intro-title"><span className="eyebrow">01 / VISÃO INTEGRADA</span><div><h2 id="solutions-intro-title">Pensar o todo.<br /><span>Conectar cada parte.</span></h2><div className="ms-solutions-introColumns"><p>Uma experiência digital acontece no encontro entre o que se quer comunicar e o que precisa funcionar. Por isso, estratégia, tecnologia e criatividade fazem parte da mesma conversa.</p><p>A proposta do Mystra é olhar para essas conexões com intenção: entender o contexto, explorar alternativas e construir caminhos coerentes com cada desafio.</p></div><div className="ms-solutions-disciplines"><span>ÁREAS QUE ORIENTAM A PROPOSTA DO ESTÚDIO</span><p>Desenvolvimento Web <i>·</i> UX/UI <i>·</i> Branding <i>·</i> Automações <i>·</i> Consultoria Digital</p></div></div></section>

      <section id="catalogo" className="ms-solutions-catalog" aria-labelledby="catalog-title"><div className="container ms-solutions-section"><div className="ms-solutions-sectionHeading"><div><span className="eyebrow">02 / CATÁLOGO DE SOLUÇÕES</span><h2 id="catalog-title">Um próximo passo<br /><span>para cada possibilidade.</span></h2></div><p>Explore os serviços publicados e encontre novas perspectivas para sua ideia. Cada solução traz sua proposta, seus benefícios e suas conexões tecnológicas.</p></div><Suspense fallback={<CatalogLoading />}><ServicesCatalog searchParams={searchParams} /></Suspense></div></section>

      <section id="abordagem" className="container ms-solutions-section" aria-labelledby="approach-title"><div className="ms-solutions-sectionHeading"><div><span className="eyebrow">03 / NOSSA ABORDAGEM</span><h2 id="approach-title">O caminho também<br /><span>faz parte da solução.</span></h2></div><p>Uma metodologia proposta para conectar intenção e execução. As etapas dão direção ao processo, com espaço para voltar, questionar e refinar.</p></div><ol className="ms-solutions-approach">{approach.map((step, index) => <li key={step.title}><div><span className="ms-solutions-stepIndex">{String(index + 1).padStart(2, "0")}</span><step.icon size={24} strokeWidth={1.15} aria-hidden="true" /></div><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol><div className="ms-solutions-approachBottom"><span>Da primeira pergunta à próxima evolução.</span><Link href="/sobre" className="text-link">Conheça o jeito Mystra <ArrowUpRight size={17} aria-hidden="true" /></Link></div></section>

      <section className="ms-solutions-custom" aria-labelledby="custom-title"><div className="container ms-solutions-section ms-solutions-customGrid"><div className="ms-solutions-customArt" aria-hidden="true"><div /><div /><div /><Asterisk size={105} strokeWidth={.8} /><span>FORA DO MOLDE.<br />DENTRO DO CONTEXTO.</span></div><div><span className="eyebrow">04 / SOLUÇÕES PERSONALIZADAS</span><h2 id="custom-title">Sua ideia não precisa<br /><span>caber em uma caixa.</span></h2><p>Alguns desafios atravessam mais de uma disciplina. Um site pode pedir uma nova linguagem; um processo pode precisar de uma integração; uma experiência pode começar com uma pergunta diferente.</p><p>Uma abordagem específica parte desse contexto para combinar as peças certas. O catálogo é um ponto de partida para conhecer possibilidades.</p><ButtonLink href="/contato" variant="secondary">Conheça os canais de contato</ButtonLink></div></div></section>

      <section className="container ms-solutions-finalSection" aria-labelledby="solutions-cta-title"><div className="ms-solutions-finalCta"><span className="eyebrow">A PRÓXIMA POSSIBILIDADE COMEÇA AQUI.</span><div><h2 id="solutions-cta-title">Vamos dar forma<br />à sua próxima ideia?</h2><ButtonLink href="/contato">Ir para contato</ButtonLink></div><footer><span>MYSTRA STUDIO / PROJETO CONCEITUAL DE PORTFÓLIO</span><Asterisk size={23} strokeWidth={1.2} aria-hidden="true" /></footer></div></section>
    </div>
  );
}
