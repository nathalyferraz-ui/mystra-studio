"use client";
import { useRef, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { TableKit } from "@tiptap/extension-table";
import { Button, Input, Select } from "@/components/ui";
import { RichContent } from "./rich-content";
import { safeHref, codeLanguages, type RichNode } from "./rich-text";
import { insightLowlight } from "@/features/insights/highlight";
import "@/features/insights/insights.css";
export type MediaOption = { id: string; name: string; alt: string };
const CaptionImage = Image.extend({ addAttributes() { return { ...this.parent?.(), caption: { default: null, rendered: false } }; } });
export function RichEditor({ value, onChange, media, label = "Conteúdo do artigo", extended = false, uploadConfigured = false, onUploaded, onUploadBusy }: { value: RichNode; onChange: (value: RichNode) => void; media: MediaOption[]; label?: string; extended?: boolean; uploadConfigured?: boolean; onUploaded?: (item: MediaOption) => void; onUploadBusy?: (busy: boolean) => void }) {
  const [preview, setPreview] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [imageId, setImageId] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [uploadName, setUploadName] = useState("");
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, code: false, codeBlock: false, strike: false, underline: false, link: { openOnClick: false, autolink: false, defaultProtocol: "https", protocols: ["http", "https"] } }), CaptionImage, CodeBlockLowlight.configure({ lowlight: insightLowlight, defaultLanguage: "plaintext" }), TableKit.configure({ table: { resizable: false } })],
    content: value, immediatelyRender: false,
    editorProps: { attributes: { class: "prose rich-editor-content", "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichNode),
  });
  useEditorState({ editor, selector: ({ editor }) => editor?.state });
  async function upload() {
    const image = file.current?.files?.[0];
    if (!image || !uploadName.trim() || !imageAlt.trim()) { setError("Informe arquivo, nome e texto alternativo antes de enviar."); return; }
    if (image.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(image.type)) { setError("Use JPEG, PNG ou WebP estático de até 8 MB."); return; }
    setUploading(true); onUploadBusy?.(true); setError("");
    try {
      const form = new FormData(); form.set("file", image); form.set("name", uploadName); form.set("alt", imageAlt);
      const response = await fetch("/api/media", { method: "POST", body: form }); const item = await response.json();
      if (!response.ok) throw new Error(item.message || "O upload não foi confirmado.");
      onUploaded?.({ id: item.id, name: item.name, alt: item.alt });
      editor?.chain().focus().setImage({ src: `/api/media/${item.id}`, alt: item.alt }).updateAttributes("image", { caption }).run();
      setUploadName(""); if (file.current) file.current.value = "";
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível enviar a imagem."); }
    finally { setUploading(false); onUploadBusy?.(false); }
  }
  if (!editor) return <div className="loading" role="status">Carregando editor…</div>;
  const text = editor.getText().trim();
  const words = text ? text.split(/\s+/u).length : 0;
  return <div className={`rich-editor${extended ? " ms-insights-editor" : ""}`}><div className="editor-toolbar" role="toolbar" aria-label={`Formatação: ${label}`}><button type="button" aria-pressed={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b><span className="sr-only">Negrito</span></button><button type="button" aria-pressed={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i><span className="sr-only">Itálico</span></button>{(extended ? [2, 3, 4] as const : [2, 3] as const).map(level => <button type="button" key={level} aria-pressed={editor.isActive("heading", { level })} onClick={() => editor.chain().focus().toggleHeading({ level }).run()}>H{level}</button>)}<button type="button" onClick={() => editor.chain().focus().setParagraph().run()}>Parágrafo</button><button type="button" aria-pressed={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• Lista</button><button type="button" aria-pressed={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Lista</button><button type="button" aria-pressed={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Citação</button><button type="button" onClick={() => editor.chain().focus().setHorizontalRule().run()}>Separador</button><button type="button" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>Desfazer</button>{extended && <button type="button" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>Refazer</button>}<button type="button" onClick={() => setPreview(!preview)} aria-pressed={preview}>{preview ? "Editar" : "Prévia"}</button></div><div className="editor-insert"><label>Link no texto selecionado<Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://… ou /caminho" /></label><Button type="button" variant="secondary" onClick={() => { if (!safeHref(link)) { setError("Informe um link HTTP(S) ou caminho interno válido."); return; } editor.chain().focus().extendMarkRange("link").setLink({ href: link }).run(); setError(""); }}>Aplicar link</Button><Button type="button" variant="ghost" onClick={() => editor.chain().focus().unsetLink().run()}>Remover link</Button></div><details className="ms-insights-editorMedia"><summary>Imagens da biblioteca e texto alternativo</summary><div className="editor-insert"><label>Imagem da biblioteca<Select value={imageId} onChange={e => { setImageId(e.target.value); setImageAlt(media.find(item => item.id === e.target.value)?.alt ?? ""); }}><option value="">Selecione uma imagem</option>{media.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label><label>Texto alternativo<Input value={imageAlt} maxLength={300} onChange={e => setImageAlt(e.target.value)} /></label><label>Legenda opcional<Input value={caption} maxLength={500} onChange={e => setCaption(e.target.value)} /></label><Button type="button" variant="secondary" onClick={() => { if (!media.some(item => item.id === imageId) || !imageAlt.trim()) { setError("Selecione uma imagem e descreva seu conteúdo."); return; } editor.chain().focus().setImage({ src: `/api/media/${imageId}`, alt: imageAlt }).updateAttributes("image", { caption }).run(); setError(""); }}>Inserir imagem</Button>{editor.isActive("image") && <Button type="button" variant="secondary" onClick={() => { if (!imageAlt.trim()) { setError("Informe o texto alternativo."); return; } editor.chain().focus().updateAttributes("image", { alt: imageAlt, caption }).run(); }}>Atualizar imagem selecionada</Button>}</div>{extended && <div className="editor-insert"><p className="form-hint">{uploadConfigured ? "Upload autorizado: JPEG, PNG ou WebP até 8 MB. Preencha o texto alternativo acima." : "Uploads indisponíveis até configurar o Storage. Imagens existentes podem ser selecionadas."}</p><label>Nova imagem<Input ref={file} type="file" accept="image/jpeg,image/png,image/webp" disabled={!uploadConfigured || uploading} /></label><label>Nome na biblioteca<Input value={uploadName} maxLength={180} onChange={e => setUploadName(e.target.value)} disabled={!uploadConfigured || uploading} /></label><Button type="button" variant="secondary" disabled={!uploadConfigured || uploading} onClick={upload}>{uploading ? "Enviando…" : "Enviar e inserir"}</Button></div>}</details>{extended && <div className="editor-insert"><label>Linguagem do bloco<Select value={language} onChange={e => { setLanguage(e.target.value); if (editor.isActive("codeBlock")) editor.chain().focus().updateAttributes("codeBlock", { language: e.target.value }).run(); }}>{codeLanguages.map(item => <option key={item} value={item}>{item}</option>)}</Select></label><Button type="button" variant="secondary" onClick={() => editor.chain().focus().toggleCodeBlock({ language }).run()}>Bloco de código</Button><Button type="button" variant="secondary" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Inserir tabela</Button>{editor.isActive("table") && <><Button type="button" variant="ghost" onClick={() => editor.chain().focus().addRowAfter().run()}>Adicionar linha</Button><Button type="button" variant="ghost" onClick={() => editor.chain().focus().addColumnAfter().run()}>Adicionar coluna</Button><Button type="button" variant="ghost" onClick={() => editor.chain().focus().deleteRow().run()}>Remover linha</Button><Button type="button" variant="ghost" onClick={() => editor.chain().focus().deleteColumn().run()}>Remover coluna</Button><Button type="button" variant="ghost" onClick={() => editor.chain().focus().deleteTable().run()}>Remover tabela</Button></>}</div>}{error && <p role="alert" className="form-error">{error}</p>}{preview ? <div className="editor-preview"><RichContent value={value} /></div> : <EditorContent editor={editor} />}{extended && <div className="ms-insights-editorFooter"><span>{words} palavras · aproximadamente {Math.max(1, Math.ceil(words / 200))} min de leitura</span><span>Prévia local · salve para persistir</span></div>}</div>;
}
