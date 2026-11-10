"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { leadSchema, leadTypes, type LeadResult } from "./schema";
type Props = { quote?: boolean; enabled: boolean; token: string; initialType?: string; initialService?: string; services: { id: string; title: string }[]; attachments: boolean };
const steps = ["Seu contato", "O projeto", "Escopo e expectativas", "Revisão e envio"];
export function CommercialForm({ quote = false, enabled, token, initialType = "GERAL", initialService = "", services, attachments }: Props) {
  const [values, setValues] = useState<Record<string, string>>({ name: "", email: "", phone: "", company: "", type: quote ? "ORCAMENTO" : initialType, subject: quote ? "Solicitação de orçamento" : "Contato com o Mystra Studio", message: "", serviceId: initialService, projectType: "", deadline: "", investment: "", website: "" });
  const [privacy, setPrivacy] = useState(false), [step, setStep] = useState(0), [pending, setPending] = useState(false), [result, setResult] = useState<LeadResult>(), [errors, setErrors] = useState<Record<string, string[]>>({});
  const [fileName, setFileName] = useState("");
  const file = useRef<HTMLInputElement>(null); const lock = useRef(false); const heading = useRef<HTMLHeadingElement>(null);
  const update = (key: string, value: string) => { setValues(previous => ({ ...previous, [key]: value })); setErrors(previous => ({ ...previous, [key]: [] })); };
  function validate(fields?: string[]) {
    const parsed = leadSchema.safeParse({ ...values, privacy: fields ? true : privacy, token });
    const all = parsed.success ? {} : parsed.error.flatten().fieldErrors;
    const relevant = Object.fromEntries(Object.entries(all).filter(([key]) => !fields || fields.includes(key))) as Record<string, string[]>;
    setErrors(relevant); const first = Object.keys(relevant)[0];
    if (first) requestAnimationFrame(() => document.getElementById(`lead-${first}`)?.focus());
    return !first;
  }
  function move(next: number) {
    const groups = [["name", "email", "phone", "company"], ["projectType", "serviceId"], ["message", "deadline", "investment"]];
    if (next > step && !validate(groups[step])) return;
    setStep(next); requestAnimationFrame(() => heading.current?.focus());
  }
  const field = (key: string, label: string, max: number, required = false, type = "text", multiline = false) => <label className={`ms-contact-field ${multiline ? "ms-contact-wide" : ""}`} htmlFor={`lead-${key}`}>{label}{required && " *"}{multiline ? <Textarea id={`lead-${key}`} value={values[key]} onChange={e => update(key, e.target.value)} rows={7} maxLength={max} required={required} aria-invalid={!!errors[key]?.length} aria-describedby={errors[key]?.length ? `error-${key}` : undefined} /> : <Input id={`lead-${key}`} type={type} value={values[key]} onChange={e => update(key, e.target.value)} maxLength={max} required={required} autoComplete={({ name: "name", email: "email", phone: "tel", company: "organization" } as Record<string, string>)[key]} aria-invalid={!!errors[key]?.length} aria-describedby={errors[key]?.length ? `error-${key}` : undefined} />}{!!errors[key]?.length && <span id={`error-${key}`} className="field-error">{errors[key].join(" ")}</span>}</label>;
  if (result?.ok) return <div className="ms-contact-received" role="status"><Check size={40} aria-hidden="true" /><h3>Sua ideia chegou.</h3><p>{result.message}</p><p>O registro está disponível para acompanhamento interno. Esta confirmação não representa envio de e-mail ou contratação.</p><Link href="/servicos" className="text-link">Continue explorando as soluções ↗</Link></div>;
  return <form className="ms-contact-form" noValidate aria-busy={pending} onSubmit={async event => {
    event.preventDefault(); if (lock.current) return; if (quote && step < 3) { move(step + 1); return; } if (!enabled) return;
    if (!validate()) { if (quote) setStep(3); return; }
    lock.current = true; setPending(true); setResult(undefined);
    try { const body = new FormData(); Object.entries(values).forEach(([key, value]) => body.set(key, value)); body.set("privacy", String(privacy)); body.set("token", token); const selected = file.current?.files?.[0]; if (quote && selected) body.set("attachment", selected);
      const response = await fetch("/api/leads", { method: "POST", body }); const data = await response.json();
      setResult({ ok: response.ok && data.ok === true, message: data.message || "Não foi possível confirmar o recebimento." }); setErrors(data.errors || {});
    } catch { setResult({ ok: false, message: "Não foi possível confirmar o recebimento. Verifique sua conexão e tente novamente." }); }
    finally { lock.current = false; setPending(false); }
  }}>
    {!enabled && <p className="notice" role="status">O recebimento de mensagens ainda não está habilitado. Você pode conhecer os campos, mas o envio está indisponível até a conclusão da configuração.</p>}
    {quote && <ol className="ms-contact-steps" aria-label="Etapas do orçamento">{steps.map((label, i) => <li key={label} aria-current={i === step ? "step" : undefined}><span>{i < step ? <Check size={15} /> : i + 1}</span>{label}</li>)}</ol>}
    <h3 ref={heading} tabIndex={-1}>{quote ? steps[step] : "Abra uma conversa."}</h3><p className="form-hint">* Campos obrigatórios. Não envie senhas, documentos pessoais ou informações sensíveis.</p>
    <fieldset disabled={pending} className="ms-contact-fields">
      <div hidden={quote && step !== 0} className="ms-contact-grid">{field("name", "Nome completo", 120, true)}{field("email", "E-mail", 254, true, "email")}{field("phone", quote ? "Telefone" : "Telefone (opcional)", 30, quote, "tel")}{field("company", "Empresa (opcional)", 160)}</div>
      {!quote && <div className="ms-contact-grid"><label className="ms-contact-field">Finalidade<Select value={values.type} onChange={e => update("type", e.target.value)}>{Object.entries(leadTypes).filter(([key]) => key !== "ORCAMENTO").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></label>{field("subject", "Assunto", 180, true)}</div>}
      {quote && <div hidden={step !== 1} className="ms-contact-grid">{field("projectType", "Nome ou tipo do projeto", 180, true)}<label className="ms-contact-field">Serviço de interesse<Select id="lead-serviceId" value={values.serviceId} onChange={e => update("serviceId", e.target.value)}><option value="">Ainda em definição</option>{services.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</Select>{errors.serviceId && <span className="field-error">{errors.serviceId.join(" ")}</span>}</label>{!services.length && <p className="form-hint">Não há serviços publicados para selecionar. Você pode descrever o projeto sem associar um serviço.</p>}</div>}
      <div hidden={quote && step !== 2} className="ms-contact-grid">{field("message", quote ? "Descreva sua ideia e o escopo" : "Mensagem", 10000, true, "text", true)}{quote && <>{field("deadline", "Prazo desejado (pode estar em definição)", 160, true)}{field("investment", "Faixa de investimento (opcional)", 160)}<label className="ms-contact-field ms-contact-wide">Referência visual (opcional)<Input ref={file} type="file" accept="image/jpeg,image/png,image/webp" disabled={!attachments} onChange={e => { const selected = e.target.files?.[0]; setFileName(selected?.name || ""); if (selected && selected.size > 2097152) { e.target.value = ""; setFileName(""); setResult({ ok: false, message: "O anexo deve ter até 2 MB." }); } }} /><span className="form-hint">{attachments ? "JPEG, PNG ou WebP estático até 2 MB, armazenado com acesso restrito. PDF e outros documentos não são aceitos nesta versão." : "Anexos indisponíveis até configurar o armazenamento privado."}</span></label></>}</div>
      {quote && step === 3 && <div className="ms-contact-review"><h4>Confira antes de enviar.</h4><dl>{["name", "email", "phone", "company", "projectType", "message", "deadline", "investment"].filter(key => values[key]).map(key => <div key={key}><dt>{({ name: "Nome", email: "E-mail", phone: "Telefone", company: "Empresa", projectType: "Projeto", message: "Escopo", deadline: "Prazo", investment: "Investimento" } as Record<string, string>)[key]}</dt><dd>{values[key]}</dd></div>)}<div><dt>Serviço</dt><dd>{services.find(s => s.id === values.serviceId)?.title || "Em definição"}</dd></div>{fileName && <div><dt>Anexo</dt><dd>{fileName}</dd></div>}</dl><Button type="button" variant="ghost" onClick={() => move(0)}>Revisar informações</Button></div>}
      {(!quote || step === 3) && <label className="checkbox-label ms-contact-privacy"><input id="lead-privacy" type="checkbox" checked={privacy} onChange={e => setPrivacy(e.target.checked)} aria-invalid={!!errors.privacy?.length} aria-describedby="privacy-purpose" /><span>Li o <Link href="/privacidade">aviso de privacidade</Link> e estou ciente do uso destas informações para responder à solicitação. *{errors.privacy && <span className="field-error">{errors.privacy.join(" ")}</span>}</span></label>}
      <div className="ms-contact-trap" aria-hidden="true"><label>Deixe em branco<Input name="website" value={values.website} onChange={e => update("website", e.target.value)} tabIndex={-1} autoComplete="off" /></label></div>
      <div className="ms-contact-formActions">{quote && step > 0 && <Button type="button" variant="ghost" onClick={() => move(step - 1)}><ArrowLeft size={16} />Voltar</Button>}{quote && step < 3 ? <Button type="button" onClick={() => move(step + 1)}>Continuar<ArrowRight size={16} /></Button> : <Button type="submit" disabled={!enabled || pending}>{pending ? "Confirmando recebimento…" : quote ? "Enviar solicitação" : "Enviar mensagem"}<Send size={16} aria-hidden="true" /></Button>}</div>
    </fieldset><p id="privacy-purpose" className="form-hint">Os dados serão usados no atendimento desta solicitação. Não há inscrição automática em marketing.</p>{result && <p role="alert" className="form-error">{result.message}</p>}
  </form>;
}
