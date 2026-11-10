"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div role="alert" className="container interior-page"><h1>Não foi possível carregar esta página.</h1><p>Tente novamente em instantes. Nenhuma operação foi confirmada.</p><Button onClick={reset}>Tentar novamente</Button></div>; }
