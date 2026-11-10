"use client";
import { useRef, type ReactNode } from "react";
import { Button } from "./index";
export function Dialog({ title, trigger, children }: { title: string; trigger: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return <><Button variant="secondary" onClick={() => ref.current?.showModal()}>{trigger}</Button><dialog ref={ref} aria-label={title} onClick={e => { if (e.target === e.currentTarget) ref.current?.close(); }}><h2>{title}</h2>{children}<Button onClick={() => ref.current?.close()}>Fechar</Button></dialog></>;
}
