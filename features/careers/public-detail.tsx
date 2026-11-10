import Link from "next/link";
import { cache } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { apiUser } from "@/lib/api-authorization";
import { getDb } from "@/lib/db";
import { formSecret, createFormToken, digest } from "@/lib/form-security";
import { Badge } from "@/components/ui";
import { careersReady, intakeConfigured } from "./availability";
import { careersConfig } from "./config";
import { careerStorageConfigured, privateCareerStorage } from "./storage";
import { jobPublicWhere, jobPublicSelect, type PublicJob } from "./queries";
import { jobModes, jobLevels } from "./schema";
import { jobAcceptsApplications, canReadApplications } from "./rules";
import { ApplicationForm, DemoApplication } from "./application-form";
import "./careers.css";
export const publishedJob = cache(async (slug: string) => { await connection(); if (!await careersReady()) return null; return getDb().job.findFirst({ where: { ...jobPublicWhere(), slug }, select: jobPublicSelect }); });
export async function JobDetail({ job, preview = false }: { job: PublicJob; preview?: boolean }) {
  const config = careersConfig(), open = jobAcceptsApplications(job); let enabled = false;
  try { enabled = !preview && open && await intakeConfigured() && careerStorageConfigured(); if (enabled && config.mode === "test") { const user = await apiUser(await headers()); enabled = !!user && canReadApplications(user); } if (enabled) await privateCareerStorage(); } catch { enabled = false; }
  return <div className="ms-careers-detail"><header className="container ms-careers-detailHero"><Link className="text-link" href={preview ? "/admin/vagas" : "/trabalhe-conosco#oportunidades"}>← Voltar às oportunidades</Link><div className="ms-careers-detailLabels"><span className="eyebrow">{job.area}</span><Badge>{open ? "Aberta no CMS" : "Candidaturas encerradas"}</Badge>{preview && <Badge>Prévia privada</Badge>}</div><h1>{job.title}</h1><p>{job.summary}</p><ul><li>{jobModes[job.mode]}</li><li>{jobLevels[job.level]}</li><li>{job.contractType}</li>{job.location && <li>{job.location}</li>}</ul><div className="ms-careers-detailDates">{job.publishedAt && <span>Publicação: {job.publishedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>}{job.deadline && <span>Prazo: {job.deadline.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (America/Sao_Paulo)</span>}</div><p className="ms-careers-concept">Mystra Studio é uma empresa fictícia e um projeto de portfólio. Este cadastro não representa uma oferta real de emprego.</p></header><div className="container ms-careers-detailGrid"><div>{([["Sobre a proposta", job.description], ["Responsabilidades", job.responsibilities], ["Requisitos obrigatórios", job.requirements], ["Diferenciais", job.desirable], ["Benefícios definidos no cadastro", job.benefits]] as const).filter(([, value]) => value).map(([title, value]) => <section key={title}><h2>{title}</h2><p>{value}</p></section>)}</div><aside id="candidatura">{enabled && config.mode !== "demo" ? <ApplicationForm jobId={job.id} token={createFormToken(digest("careers-applications", formSecret()!))} mode={config.mode} maxBytes={config.maxCVBytes} /> : <>{!open && <p className="notice" role="status">Esta oportunidade não está recebendo candidaturas.</p>}{open && config.mode !== "demo" && <p className="notice" role="status">O recebimento está indisponível. Não envie dados ou documentos reais.</p>}<DemoApplication /></>}</aside></div></div>;
}
export async function PublicJobDetail({ slug }: { slug: string }) { const job = await publishedJob(slug); if (!job) notFound(); return <JobDetail job={job} />; }
