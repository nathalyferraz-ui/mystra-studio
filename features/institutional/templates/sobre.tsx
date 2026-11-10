import { HeroImage } from "../hero-image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  Asterisk,
  Braces,
  CircleDot,
  Compass,
  Fingerprint,
  Focus,
  Layers3,
  Lightbulb,
  MoveUpRight,
  Orbit,
  ScanLine,
  Sparkles,
  Workflow,
} from "lucide-react";
import { ButtonLink } from "@/components/ui";
import "@/features/about/about.css";
import type { TemplateSection } from "../schema";
function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <span className="eyebrow ms-about-label"><span>{number}</span>{children}</span>;
}
export function AboutTemplate({section}:{section:TemplateSection}) { const f=section.fields; switch(section.variant) {
case "sobre-0": {  return (<section className="container ms-about-hero" aria-labelledby="about-title">
        <div className="ms-about-heroTop">
          <span className="eyebrow"><span className="status-dot"/>{f["field1"]}</span>
          <span className="ms-about-micro">{f["field2"]}</span>
        </div>
        <div className="ms-about-heroGrid">
          <div className="ms-about-heroCopy">
            <p className="ms-about-overline">{f["field3"]}</p>
            <h1 id="about-title">{f["field4"]}<br />{f["field5"]}{" "}<span>{f["field6"]}</span></h1>
            <p className="ms-about-heroIntro">{f["field7"]}</p>
            <a href={f["field8"]} className="ms-about-discover">{f["field9"]}<span><ArrowDown size={17} aria-hidden="true"/></span></a>
          </div>
          {section.imageId ? <HeroImage imageId={section.imageId} secondaryImageId={section.secondaryImageId} /> : (<div className="ms-about-art" aria-hidden="true">
            <div className="ms-about-artGrid"/>
            <span className="ms-about-artCaption">{f["field10"]}</span>
            <div className="ms-about-artOrbit"/>
            <div className="ms-about-artSheetBack"><span>{f["field11"]}</span><Braces size={36} strokeWidth={1}/></div>
            <div className="ms-about-artSheetFront"><span>{f["field12"]}</span><Asterisk size={142} strokeWidth={.8}/><span className="ms-about-artSheetFooter">{f["field13"]}<ArrowUpRight size={17}/></span></div>
            <span className="ms-about-artSpark">{f["field14"]}</span>
            <span className="ms-about-artCross">{f["field15"]}</span>
            <div className="ms-about-artCoordinates"><span>{f["field16"]}</span><span>{f["field17"]}</span></div>
          </div>)}
        </div>
        <div className="ms-about-heroBottom"><span>{f["field18"]}</span><span>{f["field19"]}</span></div>
      </section>); }
case "sobre-1": {  return (<section id="quem-somos" className="container ms-about-section ms-about-introduction" aria-labelledby="who-title">
        <SectionLabel number="01">{f["field1"]}</SectionLabel>
        <div className="ms-about-introductionBody">
          <h2 id="who-title">{f["field2"]}<br /><span>{f["field3"]}</span></h2>
          <div className="ms-about-introductionColumns">
            <p>{f["field4"]}</p>
            <p>{f["field5"]}</p>
          </div>
          <div className="ms-about-signature"><span aria-hidden="true">{f["field6"]}</span><p>{f["field7"]}<br /><strong>{f["field8"]}</strong></p><ArrowDownRight size={36} strokeWidth={1} aria-hidden="true"/></div>
        </div>
      </section>); }
case "sobre-2": { const principles = [
    { title: f["field1"], text: f["field2"] },
    { title: f["field3"], text: f["field4"] },
    { title: f["field5"], text: f["field6"] },
    { title: f["field7"], text: f["field8"] },
]; return (<section className="ms-about-essence" aria-labelledby="essence-title">
        <div className="container ms-about-section">
          <div className="ms-about-sectionHeader"><SectionLabel number="02">{f["field9"]}</SectionLabel><h2 id="essence-title">{f["field10"]}<br /><span>{f["field11"]}</span></h2></div>
          <div className="ms-about-essenceGrid">
            <article className="ms-about-purpose"><span className="ms-about-smallLabel">{f["field12"]}</span><CircleDot size={42} strokeWidth={1} aria-hidden="true"/><h3>{f["field13"]}<br />{f["field14"]}<br /><em>{f["field15"]}</em></h3><p>{f["field16"]}</p><span className="ms-about-purposeDecoration" aria-hidden="true">{f["field17"]}</span></article>
            <div className="ms-about-direction"><article><span className="ms-about-smallLabel">{f["field18"]}</span><h3>{f["field19"]}</h3><p>{f["field20"]}</p></article><article><span className="ms-about-smallLabel">{f["field21"]}</span><h3>{f["field22"]}</h3><p>{f["field23"]}</p></article></div>
          </div>
          <div className="ms-about-valuesHeader"><span className="ms-about-smallLabel">{f["field24"]}</span><span className="ms-about-micro">{f["field25"]}</span></div>
          <div className="ms-about-values">{principles.map((item, index) => <article key={item.title}><span className="ms-about-valueMark" aria-hidden="true">{[f["field26"], f["field27"], f["field28"], f["field29"]][index]}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        </div>
      </section>); }
case "sobre-3": {  return (<section className="container ms-about-section ms-about-editorial" aria-labelledby="drive-title">
        <div className="ms-about-editorialIntro"><SectionLabel number="03">{f["field1"]}</SectionLabel><p>{f["field2"]}<br />{f["field3"]}</p></div>
        <h2 id="drive-title" className="ms-about-wordComposition"><span>{f["field4"]}<i aria-hidden="true">{f["field5"]}</i></span><span>{f["field6"]}<i aria-hidden="true">{f["field7"]}</i></span><span>{f["field8"]}<small aria-hidden="true">{f["field9"]}</small></span></h2>
        <div className="ms-about-editorialFooter"><span className="ms-about-editorialGlyph" aria-hidden="true"><Orbit size={62} strokeWidth={.7}/></span><p>{f["field10"]}</p></div>
      </section>); }
case "sobre-4": { const process = [
    { name: f["field1"], verb: f["field2"], text: f["field3"], detail: f["field4"], icon: ScanLine },
    { name: f["field5"], verb: f["field6"], text: f["field7"], detail: f["field8"], icon: Compass },
    { name: f["field9"], verb: f["field10"], text: f["field11"], detail: f["field12"], icon: Lightbulb },
    { name: f["field13"], verb: f["field14"], text: f["field15"], detail: f["field16"], icon: Braces },
    { name: f["field17"], verb: f["field18"], text: f["field19"], detail: f["field20"], icon: Orbit },
]; return (<section className="ms-about-methodology" aria-labelledby="method-title">
        <div className="container ms-about-section">
          <div className="ms-about-methodHeader"><div><SectionLabel number="04">{f["field21"]}</SectionLabel><h2 id="method-title">{f["field22"]}<br /><span>{f["field23"]}</span></h2></div><p>{f["field24"]}</p></div>
          <ol className="ms-about-process">{process.map((step, index) => <li key={step.name}><div className="ms-about-processStation"><span>{String(index + 1).padStart(2, "0")}</span><step.icon size={23} strokeWidth={1.3} aria-hidden="true"/></div><h3>{step.name}</h3><p className="ms-about-processVerb">{step.verb}</p><p>{step.text}</p><span className="ms-about-processDetail">{step.detail}</span></li>)}</ol>
          <div className="ms-about-processLoop"><span aria-hidden="true">{f["field25"]}</span>{f["field26"]}</div>
        </div>
      </section>); }
case "sobre-5": { const specialties = [
    { title: f["field1"], text: f["field2"], query: f["field3"], tag: f["field4"], icon: Braces },
    { title: f["field5"], text: f["field6"], query: f["field7"], tag: f["field8"], icon: Focus },
    { title: f["field9"], text: f["field10"], query: f["field11"], tag: f["field12"], icon: Fingerprint },
    { title: f["field13"], text: f["field14"], query: f["field15"], tag: f["field16"], icon: Workflow },
    { title: f["field17"], text: f["field18"], query: f["field19"], tag: f["field20"], icon: Compass },
]; return (<section className="container ms-about-section" aria-labelledby="specialties-title">
        <div className="ms-about-specialtiesHeader"><div><SectionLabel number="05">{f["field21"]}</SectionLabel><h2 id="specialties-title">{f["field22"]}<br /><span>{f["field23"]}</span></h2></div><p>{f["field24"]}</p></div>
        <div className="ms-about-specialties">{specialties.map((item, index) => <Link className="ms-about-specialty" key={item.title} href={`/servicos?q=${encodeURIComponent(item.query)}`}><div className="ms-about-specialtyTop"><item.icon size={30} strokeWidth={1.15} aria-hidden="true"/><span className="ms-about-micro">{String(index + 1).padStart(2, "0")}{f["field25"]}</span></div><h3>{item.title}</h3><p>{item.text}</p><div className="ms-about-specialtyFooter"><span>{item.tag}</span><ArrowUpRight size={21} strokeWidth={1.3} aria-hidden="true"/><span className="sr-only">{f["field26"]}{" "}{item.title}{" "}{f["field27"]}</span></div></Link>)}</div>
      </section>); }
case "sobre-6": { const tools = [
    { title: f["field1"], icon: Layers3, text: f["field2"], items: [f["field3"], f["field4"], f["field5"], f["field6"]] },
    { title: f["field7"], icon: Braces, text: f["field8"], items: [f["field9"], f["field10"], f["field11"], f["field12"]] },
    { title: f["field13"], icon: Workflow, text: f["field14"], items: [f["field15"], f["field16"], f["field17"], f["field18"]] },
]; return (<section className="container ms-about-section ms-about-toolsSection" aria-labelledby="tools-title">
        <div className="ms-about-toolsIntro"><SectionLabel number="06">{f["field19"]}</SectionLabel><h2 id="tools-title">{f["field20"]}<br /><span>{f["field21"]}</span></h2><p>{f["field22"]}</p><span className="ms-about-toolsNote"><Sparkles size={15} aria-hidden="true"/>{f["field23"]}</span></div>
        <div className="ms-about-toolsList">{tools.map(group => <article key={group.title}><div className="ms-about-toolTitle"><group.icon size={20} strokeWidth={1.3} aria-hidden="true"/><h3>{group.title}</h3></div><p>{group.text}</p><ul>{group.items.map(item => <li key={item}>{item}</li>)}</ul></article>)}</div>
      </section>); }
case "sobre-7": {  return (<section className="container ms-about-finalSection" aria-labelledby="about-cta-title">
        <div className="ms-about-cta"><span className="eyebrow">{f["field1"]}</span><div className="ms-about-ctaGrid"><h2 id="about-cta-title">{f["field2"]}<br /><em>{f["field3"]}</em></h2><div><p>{f["field4"]}</p><div className="ms-about-ctaActions"><ButtonLink href={f["field5"]}>{f["field6"]}</ButtonLink><Link className="text-link" href={f["field7"]}>{f["field8"]}<MoveUpRight size={17} aria-hidden="true"/></Link></div></div></div><div className="ms-about-ctaBottom"><span>{f["field9"]}</span><Asterisk size={22} strokeWidth={1.3} aria-hidden="true"/></div></div>
      </section>); }
default:return null;}}
