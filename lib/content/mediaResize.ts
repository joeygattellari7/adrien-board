import sharp from "sharp";
import { PlatformSpec } from "./platforms";

/**
 * Center-crops + resizes an image to a platform's target aspect ratio.
 * Returns a base64 JPEG. Video is NOT resized here — see the note in
 * lib/content/repurpose.ts for why.
 */
export async function resizeImageForPlatform(base64: string, spec: PlatformSpec): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const resized = await sharp(buffer)
    .resize(spec.imageAspect.width, spec.imageAspect.height, { fit: "cover", position: "attention" })
    .jpeg({ quality: 88 })
    .toBuffer();
  return resized.toString("base64");
}
