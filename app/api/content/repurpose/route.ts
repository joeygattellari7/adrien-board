import { NextRequest, NextResponse } from "next/server";
import { ALL_PLATFORMS, ContentPlatform, PLATFORM_SPECS } from "@/lib/content/platforms";
import { resizeImageForPlatform } from "@/lib/content/mediaResize";
import { resizeVideoForPlatform } from "@/lib/content/videoResize";
import { uploadToBlob } from "@/lib/content/blobStorage";
import { generatePlatformCopy } from "@/lib/content/generatePlatformCopy";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.product) return NextResponse.json({ error: "product is required" }, { status: 400 });

  const platforms: ContentPlatform[] = Array.isArray(body.platforms) && body.platforms.length > 0 ? body.platforms.filter((p: string) => ALL_PLATFORMS.includes(p as ContentPlatform)) : ALL_PLATFORMS;
  if (platforms.length === 0) return NextResponse.json({ error: "At least one valid platform is required" }, { status: 400 });

  const copy = await generatePlatformCopy({
    product: body.product,
    offer: body.offer || undefined,
    tone: body.tone || undefined,
    details: body.details || undefined,
    platforms,
  });

  const mediaType: "image" | "video" | undefined = body.mediaType === "image" || body.mediaType === "video" ? body.mediaType : undefined;
  const mediaBase64: string | undefined = typeof body.mediaBase64 === "string" ? body.mediaBase64 : undefined;

  // Video needs to exist at a URL before ffmpeg can read it, so upload the
  // source once up front and resize per-platform from that — rather than
  // re-uploading the original for every platform.
  let videoSourceUrl: string | undefined;
  let videoSourceError: string | undefined;
  if (mediaType === "video" && mediaBase64) {
    try {
      videoSourceUrl = await uploadToBlob(Buffer.from(mediaBase64, "base64"), `repurpose-source-${crypto.randomUUID()}.mp4`, body.mediaMimeType || "video/mp4");
    } catch (e) {
      videoSourceError = e instanceof Error ? e.message : String(e);
    }
  }

  const results = await Promise.all(
    platforms.map(async (platform) => {
      const spec = PLATFORM_SPECS[platform];
      const copyResult = copy.results.find((r) => r.platform === platform)!;
      let resizedImageBase64: string | undefined;
      let resizedVideoUrl: string | undefined;
      let mediaNote: string | undefined;

      if (mediaType === "image" && mediaBase64) {
        try {
          resizedImageBase64 = await resizeImageForPlatform(mediaBase64, spec);
        } catch {
          mediaNote = "Couldn't resize this image server-side — original file will be used as-is.";
        }
      } else if (mediaType === "video") {
        if (videoSourceUrl) {
          try {
            resizedVideoUrl = await resizeVideoForPlatform(videoSourceUrl, spec);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            mediaNote = `Couldn't auto-resize video for ${spec.label} (${message}) — falls back to your original file. Target: ${spec.videoAspect.ratio}, up to ${spec.maxVideoSeconds ?? "no limit"}s.`;
          }
        } else {
          mediaNote = `Video storage isn't configured (${videoSourceError}) — target for ${spec.label}: ${spec.videoAspect.ratio}, up to ${spec.maxVideoSeconds ?? "no limit"}s.`;
        }
      }

      return {
        platform,
        spec,
        caption: copyResult.caption,
        hashtags: copyResult.hashtags,
        resizedImageBase64,
        resizedVideoUrl,
        mediaNote,
      };
    })
  );

  return NextResponse.json({ results, copySource: copy.source });
}
