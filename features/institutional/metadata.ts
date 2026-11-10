import type { Metadata } from "next";
import { publishedSettings, publishedPage } from "./queries";
import { indexingAllowed, publicSiteOrigin } from "@/lib/site-policy";
export const configuredSiteOrigin = publicSiteOrigin;
export async function institutionalMetadata(page?: "home" | "sobre"): Promise<Metadata> {
  const settings = await publishedSettings(); const data = page ? await publishedPage(page) : null; const origin = configuredSiteOrigin(); const imageId = data?.sharingImageId || settings.identity.sharingImageId; const image = origin && imageId ? `${origin}/api/media/${imageId}` : undefined;
  const title = data?.seoTitle || settings.seo.title, description = data?.seoDescription || settings.seo.description;
  const index = indexingAllowed(settings.seo.allowIndexing);
  return { title: page ? { absolute: `${title}${page === "sobre" ? ` | ${settings.general.displayName}` : ""}` } : { default: title, template: `%s | ${settings.general.displayName}` }, description, ...(origin ? { metadataBase: new URL(origin) } : {}), ...(origin && page ? { alternates: { canonical: page === "home" ? origin : `${origin}/sobre` } } : {}), robots: { index, follow: index }, openGraph: { title, description, siteName: settings.seo.siteName, type: "website", locale: "pt_BR", ...(image ? { images: [{ url: image }] } : {}) }, icons: { icon: settings.identity.faviconId ? `/api/media/${settings.identity.faviconId}` : "/icon.svg" } };
}
