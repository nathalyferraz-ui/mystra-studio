import Link from "next/link";
/* eslint-disable @next/next/no-img-element -- Controlled identity from the media library. */
export function Brand({ name = "mystra", displayName = "Mystra Studio", imageId = "" }: { name?: string; displayName?: string; imageId?: string }) {
  return <Link href="/" className="brand" aria-label={`${displayName} — início`}>{imageId ? <img src={`/api/media/${imageId}`} alt={displayName} /> : <><span className="brand-symbol" aria-hidden="true">✳</span><span>{name}<span className="brand-studio">STUDIO</span></span></>}</Link>;
}
