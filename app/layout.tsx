import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Mystra Studio — Ideias além do óbvio", template: "%s | Mystra Studio" },
  description: "Um estúdio conceitual de tecnologia, design e experiências digitais. Projeto corporativo fictício em desenvolvimento.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body><a className="skip-link" href="#conteudo">Pular para o conteúdo</a>{children}</body>
    </html>
  );
}
