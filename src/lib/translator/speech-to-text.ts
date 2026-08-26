import { promises as fs } from "fs";
import { basename } from "path";
import type { WhisperVerboseResult } from "@/types/translator";
import { TranslatorError, mapProviderError } from "@/lib/translator/errors";
import { AUDIO_CHUNK_SECONDS } from "@/types/translator";
import { splitAudioChunks } from "@/lib/translator/media-extractor";

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new TranslatorError(
      "PROVIDER_OUTAGE",
      "Speech recognition is not configured. Set OPENAI_API_KEY."
    );
  }
  return key;
}

async function transcribeFile(
  filePath: string,
  apiKey: string
): Promise<WhisperVerboseResult> {
  const buffer = await fs.readFile(filePath);
  const blob = new Blob([buffer], { type: "audio/mpeg" });
  const form = new FormData();
  form.append("file", blob, basename(filePath) || "audio.mp3");
  form.append("model", "whisper-1");
  // Do NOT force language — Whisper auto-detects.
  form.append("response_format", "verbose_json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw mapProviderError(new Error(`Transcription failed: ${text}`));
  }

  return (await response.json()) as WhisperVerboseResult;
}

export class SpeechToTextService {
  async transcribeAudioFile(
    audioPath: string,
    workDir: string,
    onProgress?: (ratio: number) => void | Promise<void>
  ): Promise<{
    language: string | null;
    duration: number | null;
    segments: Array<{
      start: number;
      end: number;
      text: string;
    }>;
    fullText: string;
  }> {
    const apiKey = getOpenAiKey();
    const chunks = await splitAudioChunks(audioPath, workDir, AUDIO_CHUNK_SECONDS);
    const merged: Array<{ start: number; end: number; text: string }> = [];
    let detectedLanguage: string | null = null;
    let totalDuration = 0;
    let offset = 0;

    for (let i = 0; i < chunks.length; i += 1) {
      const chunkPath = chunks[i];
      const result = await transcribeFile(chunkPath, apiKey);

      if (!detectedLanguage && result.language) {
        detectedLanguage = result.language;
      }

      const chunkDuration =
        typeof result.duration === "number" && Number.isFinite(result.duration)
          ? result.duration
          : 0;

      if (result.segments && result.segments.length > 0) {
        for (const segment of result.segments) {
          const text = (segment.text || "").trim();
          if (!text) continue;
          merged.push({
            start: offset + (segment.start || 0),
            end: offset + (segment.end || segment.start || 0),
            text,
          });
        }
      } else if ((result.text || "").trim()) {
        merged.push({
          start: offset,
          end: offset + chunkDuration,
          text: result.text.trim(),
        });
      }

      offset += chunkDuration || AUDIO_CHUNK_SECONDS;
      totalDuration = offset;
      await onProgress?.((i + 1) / chunks.length);
    }

    if (merged.length === 0) {
      throw new TranslatorError(
        "SPEECH_FAILED",
        "No spoken content was detected in this media."
      );
    }

    return {
      language: detectedLanguage,
      duration: totalDuration || null,
      segments: merged,
      fullText: merged.map((s) => s.text).join("\n"),
    };
  }
}
