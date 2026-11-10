/** Public scope of v1. Deferred modules retain their code and database records. */
export const release = {
  version: "1.0.0",
  publicPaths: ["/", "/sobre", "/servicos", "/portfolio", "/blog", "/contato", "/privacidade"],
  detailPaths: ["/servicos", "/portfolio", "/blog"],
  publicIntake: false,
} as const;
export function publicPathEnabled(path: string) {
  try {
    const url = new URL(path, "https://local.invalid");
    if (url.origin !== "https://local.invalid") return false;
    const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    return (release.publicPaths as readonly string[]).includes(pathname) || release.detailPaths.some(prefix => pathname.startsWith(`${prefix}/`));
  } catch { return false; }
}
export function publicLinkEnabled(href: string) {
  if (href.startsWith("#")) return true;
  if (href.startsWith("/")) return !href.startsWith("//") && publicPathEnabled(href);
  try { const url = new URL(href); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
}
export function releaseCTA<T extends { href: string; label: string }>(cta: T): T {
  return publicLinkEnabled(cta.href) ? cta : { ...cta, href: "/servicos", label: "Conheça as soluções" };
}
