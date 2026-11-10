/* eslint-disable @next/next/no-img-element -- Validated library IDs; access checked by the existing media endpoint. */
import { institutionalMediaInfo } from "./queries";
export async function HeroImage({ imageId, secondaryImageId }: { imageId: string; secondaryImageId: string }) {
  const main = await institutionalMediaInfo(imageId); const secondary = secondaryImageId ? await institutionalMediaInfo(secondaryImageId) : null; if (!main) return null;
  return <div className="institutional-heroImages"><img src={`/api/media/${imageId}`} alt={main.alt} width={main.width} height={main.height} />{secondary && <img src={`/api/media/${secondaryImageId}`} alt={secondary.alt} width={secondary.width} height={secondary.height} />}</div>;
}
