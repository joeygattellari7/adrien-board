import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { PlatformSpec } from "./platforms";
import { uploadToBlob } from "./blobStorage";

ffmpeg.setFfmpegPath(ffmpegPath.path);

/**
 * Downloads a video from its Blob URL, center-crops + scales it to a
 * platform's target aspect ratio and trims it to the platform's max
 * duration, then uploads the result back to Blob and returns the new URL.
 *
 * This is genuinely best-effort: ffmpeg in a serverless function has real
 * constraints (Vercel's execution time limit, /tmp size, no persistent
 * disk between invocations) that can't be fully validated outside of an
 * actual deploy. Failures throw with a clear message rather than silently
 * returning the original file, so the caller can decide whether to fall
 * back to the unresized source.
 */
export async function resizeVideoForPlatform(sourceUrl: string, spec: PlatformSpec): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "adrien-video-"));
  const inputPath = join(dir, "input.mp4");
  const outputPath = join(dir, "output.mp4");

  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`Failed to fetch source video: HTTP ${res.status}`);
    await writeFile(inputPath, Buffer.from(await res.arrayBuffer()));

    const { width, height } = spec.videoAspect;
    const maxSeconds = spec.maxVideoSeconds ?? 60;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .duration(maxSeconds)
        .videoFilters([
          `scale=w=${width}:h=${height}:force_original_aspect_ratio=increase`,
          `crop=${width}:${height}`,
        ])
        .outputOptions(["-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", "-movflags", "+faststart"])
        .on("error", reject)
        .on("end", () => resolve())
        .save(outputPath);
    });

    const output = await readFile(outputPath);
    return await uploadToBlob(output, `resized-${spec.id}.mp4`, "video/mp4");
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
