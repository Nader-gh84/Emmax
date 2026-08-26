import { spawn } from "child_process";
import { createWriteStream, promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import {
  MAX_UPLOAD_BYTES,
  MIN_AUDIO_SECONDS,
  TRANSLATOR_MEDIA_BUCKET,
  WHISPER_MAX_BYTES,
  type SourcePlatform,
} from "@/types/translator";
import {
  detectPlatform,
  guessTitleFromUrl,
  isValidHttpUrl,
  requiresUploadFallback,
} from "@/lib/translator/platform";
import { TranslatorError } from "@/lib/translator/errors";

export interface ExtractedMedia {
  localPath: string;
  workDir: string;
  title: string;
  platform: SourcePlatform;
  durationSeconds: number;
  mimeType: string;
}

function runCommand(
  command: string,
  args: string[],
  opts?: { cwd?: string }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: opts?.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else {
        reject(
          new Error(
            `${command} failed (${code}): ${stderr.slice(-800) || stdout.slice(-800)}`
          )
        );
      }
    });
  });
}

export async function createWorkDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(join(tmpdir(), `emax-${prefix}-`));
  return dir;
}

export async function cleanupWorkDir(dir: string | null | undefined) {
  if (!dir) return;
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

export async function probeDurationSeconds(filePath: string): Promise<number> {
  try {
    const { stdout } = await runCommand("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const value = Number.parseFloat(stdout.trim());
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Convert any media file to mono 16kHz mp3 for Whisper efficiency. */
export async function extractAudioTrack(
  inputPath: string,
  workDir: string
): Promise<{ audioPath: string; durationSeconds: number }> {
  const audioPath = join(workDir, "audio.mp3");
  try {
    await runCommand("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "64k",
      audioPath,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/Stream map|does not contain any stream|no audio/i.test(message)) {
      throw new TranslatorError(
        "NO_AUDIO",
        "This media has no audio track we can transcribe."
      );
    }
    throw new TranslatorError(
      "EXTRACT_FAILED",
      "We couldn’t extract audio from this media. Try uploading an MP3 or M4A file instead."
    );
  }

  const durationSeconds = await probeDurationSeconds(audioPath);
  if (durationSeconds < MIN_AUDIO_SECONDS) {
    throw new TranslatorError(
      "AUDIO_TOO_SHORT",
      "The audio is too short to transcribe. Please use a longer clip."
    );
  }

  return { audioPath, durationSeconds };
}

/** Split audio into ~10 minute chunks under Whisper size limits. */
export async function splitAudioChunks(
  audioPath: string,
  workDir: string,
  chunkSeconds: number
): Promise<string[]> {
  const stats = await fs.stat(audioPath);
  if (stats.size <= WHISPER_MAX_BYTES) {
    const duration = await probeDurationSeconds(audioPath);
    if (duration <= chunkSeconds + 5) {
      return [audioPath];
    }
  }

  const pattern = join(workDir, "chunk-%03d.mp3");
  await runCommand("ffmpeg", [
    "-y",
    "-i",
    audioPath,
    "-f",
    "segment",
    "-segment_time",
    String(chunkSeconds),
    "-c",
    "copy",
    pattern,
  ]);

  const files = (await fs.readdir(workDir))
    .filter((name) => /^chunk-\d+\.mp3$/i.test(name))
    .sort()
    .map((name) => join(workDir, name));

  if (files.length === 0) {
    return [audioPath];
  }

  // Ensure each chunk is under Whisper limit; recompress oversized ones.
  const safeFiles: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const size = (await fs.stat(file)).size;
    if (size <= WHISPER_MAX_BYTES) {
      safeFiles.push(file);
      continue;
    }
    const recompressed = join(workDir, `chunk-safe-${i}.mp3`);
    await runCommand("ffmpeg", [
      "-y",
      "-i",
      file,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "48k",
      recompressed,
    ]);
    if ((await fs.stat(recompressed)).size > WHISPER_MAX_BYTES) {
      throw new TranslatorError(
        "AUDIO_TOO_LARGE",
        "A media chunk is still too large for speech recognition. Please upload a shorter file."
      );
    }
    safeFiles.push(recompressed);
  }

  return safeFiles;
}

async function downloadDirectMedia(
  url: string,
  workDir: string
): Promise<{ filePath: string; contentType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "EmaXTranslator/1.0",
        Accept: "audio/*,video/*,*/*",
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new TranslatorError(
          "LOGIN_REQUIRED",
          "This media requires login or is private. Upload the file instead."
        );
      }
      if (response.status === 404) {
        throw new TranslatorError(
          "DELETED",
          "We couldn’t find this media. It may have been deleted."
        );
      }
      throw new TranslatorError(
        "RETRIEVAL_FAILED",
        "We couldn’t download media from this link. Upload the file instead."
      );
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_UPLOAD_BYTES) {
      throw new TranslatorError(
        "AUDIO_TOO_LARGE",
        "This media file is too large. Please upload a file under 500 MB."
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    if (
      contentType.includes("text/html") ||
      contentType.includes("application/json")
    ) {
      throw new TranslatorError(
        "UNSUPPORTED_PLATFORM",
        "We couldn’t access the media directly from this link. Upload the video/audio file instead."
      );
    }

    const extFromType = contentType.includes("audio")
      ? ".mp3"
      : contentType.includes("video")
        ? ".mp4"
        : ".bin";
    const urlExt = url.match(/\.(mp3|m4a|wav|mp4|webm|mov|ogg|flac)(\?|$)/i)?.[1];
    const filePath = join(workDir, `source.${urlExt || extFromType.replace(".", "")}`);

    if (!response.body) {
      throw new TranslatorError(
        "RETRIEVAL_FAILED",
        "We couldn’t download media from this link. Upload the file instead."
      );
    }

    const nodeStream = Readable.fromWeb(response.body as never);
    await pipeline(nodeStream, createWriteStream(filePath));

    const size = (await fs.stat(filePath)).size;
    if (size <= 0) {
      throw new TranslatorError(
        "RETRIEVAL_FAILED",
        "Downloaded media was empty. Upload the file instead."
      );
    }
    if (size > MAX_UPLOAD_BYTES) {
      throw new TranslatorError(
        "AUDIO_TOO_LARGE",
        "This media file is too large. Please upload a file under 500 MB."
      );
    }

    return { filePath, contentType };
  } catch (error) {
    if (error instanceof TranslatorError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TranslatorError(
        "RETRIEVAL_FAILED",
        "Downloading the media timed out. Try uploading the file instead."
      );
    }
    throw new TranslatorError(
      "RETRIEVAL_FAILED",
      "We couldn’t access the media directly from this link. Upload the video/audio file instead."
    );
  } finally {
    clearTimeout(timeout);
  }
}

export class MediaExtractorService {
  detect(url: string) {
    if (!isValidHttpUrl(url)) {
      throw new TranslatorError("INVALID_URL", "Please paste a valid http(s) link.");
    }
    const platform = detectPlatform(url);
    return {
      platform,
      label: platform,
      needsUpload: requiresUploadFallback(platform) || platform === "other" || platform === "podcast",
      title: guessTitleFromUrl(url),
    };
  }

  async retrieveFromUrl(url: string): Promise<ExtractedMedia> {
    if (!isValidHttpUrl(url)) {
      throw new TranslatorError("INVALID_URL", "Please paste a valid http(s) link.");
    }

    const platform = detectPlatform(url);
    if (requiresUploadFallback(platform) || platform === "podcast" || platform === "other") {
      throw new TranslatorError(
        "UNSUPPORTED_PLATFORM",
        "We couldn’t access the media directly from this link. Upload the video/audio file instead."
      );
    }

    const workDir = await createWorkDir("media");
    try {
      const { filePath, contentType } = await downloadDirectMedia(url, workDir);
      const { audioPath, durationSeconds } = await extractAudioTrack(filePath, workDir);
      return {
        localPath: audioPath,
        workDir,
        title: guessTitleFromUrl(url),
        platform,
        durationSeconds,
        mimeType: contentType,
      };
    } catch (error) {
      await cleanupWorkDir(workDir);
      throw error;
    }
  }

  async prepareUploadedFile(
    inputPath: string,
    title: string
  ): Promise<ExtractedMedia> {
    const workDir = await createWorkDir("upload");
    try {
      const localCopy = join(workDir, "upload-source");
      await fs.copyFile(inputPath, localCopy);
      const { audioPath, durationSeconds } = await extractAudioTrack(localCopy, workDir);
      return {
        localPath: audioPath,
        workDir,
        title: title || "Uploaded media",
        platform: "upload",
        durationSeconds,
        mimeType: "audio/mpeg",
      };
    } catch (error) {
      await cleanupWorkDir(workDir);
      throw error;
    }
  }
}

export { TRANSLATOR_MEDIA_BUCKET };
