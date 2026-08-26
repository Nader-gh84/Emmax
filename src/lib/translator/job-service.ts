import { promises as fs } from "fs";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TRANSLATOR_MEDIA_BUCKET,
  type ExportMode,
  type SourcePlatform,
  type TranscriptionJob,
  type TranscriptionJobStatus,
  type TranscriptionJobWithSegments,
  type TranscriptSegment,
} from "@/types/translator";
import {
  MediaExtractorService,
  cleanupWorkDir,
  createWorkDir,
} from "@/lib/translator/media-extractor";
import { SpeechToTextService } from "@/lib/translator/speech-to-text";
import { LanguageDetectionService } from "@/lib/translator/language-detection";
import { TranslationService } from "@/lib/translator/translation";
import { TranslatorError, mapProviderError } from "@/lib/translator/errors";
import {
  detectPlatform,
  guessTitleFromUrl,
  isValidHttpUrl,
  platformLabel,
  requiresUploadFallback,
} from "@/lib/translator/platform";
import { STATUS_LABELS } from "@/types/translator";

type AnySupabase = SupabaseClient;

function stepFromStatus(status: TranscriptionJobStatus): string {
  return status;
}

export class TranscriptJobService {
  private media = new MediaExtractorService();
  private stt = new SpeechToTextService();
  private languages = new LanguageDetectionService();
  private translation = new TranslationService();

  constructor(private supabase: AnySupabase) {}

  async listJobs(userId: string, limit = 30): Promise<TranscriptionJob[]> {
    const { data, error } = await this.supabase
      .from("transcription_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as TranscriptionJob[];
  }

  async getJob(
    userId: string,
    jobId: string
  ): Promise<TranscriptionJobWithSegments | null> {
    const { data: job, error } = await this.supabase
      .from("transcription_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!job) return null;

    const { data: segments, error: segError } = await this.supabase
      .from("transcript_segments")
      .select("*")
      .eq("job_id", jobId)
      .order("sequence", { ascending: true });

    if (segError) throw segError;

    return {
      ...(job as TranscriptionJob),
      segments: (segments || []) as TranscriptSegment[],
    };
  }

  async createFromUrl(userId: string, sourceUrl: string): Promise<TranscriptionJob> {
    if (!isValidHttpUrl(sourceUrl)) {
      throw new TranslatorError("INVALID_URL", "Please paste a valid http(s) link.");
    }

    const platform = detectPlatform(sourceUrl);
    const needsUpload =
      requiresUploadFallback(platform) ||
      platform === "other" ||
      platform === "podcast";

    const { data, error } = await this.supabase
      .from("transcription_jobs")
      .insert({
        user_id: userId,
        source_url: sourceUrl.trim(),
        source_platform: platform,
        media_title: guessTitleFromUrl(sourceUrl),
        status: needsUpload ? "failed" : "queued",
        progress: needsUpload ? 0 : 0,
        status_message: needsUpload
          ? "Upload required"
          : STATUS_LABELS.queued,
        error_message: needsUpload
          ? "We couldn’t access the media directly from this link. Upload the video/audio file instead."
          : null,
        failed_step: needsUpload ? "getting_media" : null,
        needs_upload: needsUpload,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as TranscriptionJob;
  }

  async createFromUpload(params: {
    userId: string;
    file: File;
    sourceUrl?: string | null;
    existingJobId?: string | null;
  }): Promise<TranscriptionJob> {
    const safeName =
      params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "media.bin";
    const storagePath = `${params.userId}/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await params.file.arrayBuffer());
    const { error: uploadError } = await this.supabase.storage
      .from(TRANSLATOR_MEDIA_BUCKET)
      .upload(storagePath, buffer, {
        contentType: params.file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new TranslatorError(
        "RETRIEVAL_FAILED",
        `Failed to store upload: ${uploadError.message}. Run migration 045 if the translator-media bucket is missing.`
      );
    }

    if (params.existingJobId) {
      const { data, error } = await this.supabase
        .from("transcription_jobs")
        .update({
          storage_path: storagePath,
          source_platform: "upload" satisfies SourcePlatform,
          media_title: params.file.name || "Uploaded media",
          status: "queued",
          progress: 0,
          status_message: STATUS_LABELS.queued,
          error_message: null,
          failed_step: null,
          needs_upload: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.existingJobId)
        .eq("user_id", params.userId)
        .select("*")
        .single();

      if (error) throw error;
      return data as TranscriptionJob;
    }

    const { data, error } = await this.supabase
      .from("transcription_jobs")
      .insert({
        user_id: params.userId,
        source_url: params.sourceUrl?.trim() || null,
        source_platform: "upload",
        media_title: params.file.name || "Uploaded media",
        storage_path: storagePath,
        status: "queued",
        progress: 0,
        status_message: STATUS_LABELS.queued,
        needs_upload: false,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as TranscriptionJob;
  }

  private async updateJob(
    jobId: string,
    userId: string,
    patch: Record<string, unknown>
  ) {
    const { error } = await this.supabase
      .from("transcription_jobs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  private async failJob(
    jobId: string,
    userId: string,
    status: TranscriptionJobStatus,
    error: TranslatorError
  ) {
    await this.updateJob(jobId, userId, {
      status: "failed",
      failed_step: stepFromStatus(status),
      error_message: error.message,
      status_message: STATUS_LABELS.failed,
    });
  }

  /**
   * Run (or resume) the full pipeline for a job.
   * Resume is based on failed_step / existing segments.
   */
  async processJob(userId: string, jobId: string): Promise<TranscriptionJobWithSegments> {
    const job = await this.getJob(userId, jobId);
    if (!job) {
      throw new TranslatorError("NOT_FOUND", "Transcript job not found.");
    }

    if (job.status === "completed") {
      return job;
    }

    if (job.needs_upload && !job.storage_path) {
      throw new TranslatorError(
        "UNSUPPORTED_PLATFORM",
        "We couldn’t access the media directly from this link. Upload the video/audio file instead."
      );
    }

    const resumeFrom = job.failed_step || job.status;
    let workDir: string | null = null;

    try {
      // --- media acquisition ---
      let audioPath: string | null = null;
      let durationSeconds = job.media_duration_seconds || 0;

      const needsMedia =
        !job.segments.length ||
        resumeFrom === "queued" ||
        resumeFrom === "getting_media" ||
        resumeFrom === "extracting_audio" ||
        resumeFrom === "detecting_language" ||
        resumeFrom === "transcribing";

      if (needsMedia && !job.segments.some((s) => s.original_text)) {
        await this.updateJob(jobId, userId, {
          status: "getting_media",
          progress: 5,
          status_message: STATUS_LABELS.getting_media,
          error_message: null,
          failed_step: null,
        });

        let extracted;
        if (job.storage_path) {
          workDir = await createWorkDir("job");
          const downloadPath = join(workDir, "download.bin");
          const { data: fileData, error: dlError } = await this.supabase.storage
            .from(TRANSLATOR_MEDIA_BUCKET)
            .download(job.storage_path);

          if (dlError || !fileData) {
            throw new TranslatorError(
              "RETRIEVAL_FAILED",
              "Could not read the uploaded media file."
            );
          }
          const bytes = Buffer.from(await fileData.arrayBuffer());
          await fs.writeFile(downloadPath, bytes);

          await this.updateJob(jobId, userId, {
            status: "extracting_audio",
            progress: 15,
            status_message: STATUS_LABELS.extracting_audio,
          });

          extracted = await this.media.prepareUploadedFile(
            downloadPath,
            job.media_title
          );
          // prepareUploadedFile creates its own workDir; use that going forward
          await cleanupWorkDir(workDir);
          workDir = extracted.workDir;
          audioPath = extracted.localPath;
          durationSeconds = extracted.durationSeconds;
        } else if (job.source_url) {
          await this.updateJob(jobId, userId, {
            status: "getting_media",
            progress: 8,
            status_message: STATUS_LABELS.getting_media,
          });
          extracted = await this.media.retrieveFromUrl(job.source_url);
          workDir = extracted.workDir;
          audioPath = extracted.localPath;
          durationSeconds = extracted.durationSeconds;

          await this.updateJob(jobId, userId, {
            status: "extracting_audio",
            progress: 18,
            status_message: STATUS_LABELS.extracting_audio,
            media_title: extracted.title || job.media_title,
            source_platform: extracted.platform,
          });
        } else {
          throw new TranslatorError(
            "INVALID_URL",
            "This job has no media source. Paste a link or upload a file."
          );
        }

        await this.updateJob(jobId, userId, {
          media_duration_seconds: durationSeconds,
          status: "detecting_language",
          progress: 25,
          status_message: STATUS_LABELS.detecting_language,
        });

        await this.updateJob(jobId, userId, {
          status: "transcribing",
          progress: 30,
          status_message: `${STATUS_LABELS.transcribing} — starting`,
        });

        if (!audioPath || !workDir) {
          throw new TranslatorError("EXTRACT_FAILED", "Audio extraction failed.");
        }

        const transcript = await this.stt.transcribeAudioFile(
          audioPath,
          workDir,
          async (ratio) => {
            const progress = Math.min(70, 30 + Math.round(ratio * 40));
            await this.updateJob(jobId, userId, {
              status: "transcribing",
              progress,
              status_message: `${STATUS_LABELS.transcribing} — ${Math.round(ratio * 100)}%`,
            });
          }
        );

        const languageLabel = this.languages.toDisplayName(transcript.language);
        const originalTexts = transcript.segments.map((s) => s.text);

        // Persist originals first so translation failures can retry without re-STT.
        await this.supabase
          .from("transcript_segments")
          .delete()
          .eq("job_id", jobId);

        const originalRows = transcript.segments.map((segment, index) => ({
          job_id: jobId,
          sequence: index,
          start_time: segment.start,
          end_time: segment.end,
          speaker: null,
          original_text: originalTexts[index] || "",
          english_text: "",
          persian_text: "",
        }));

        const batchSize = 100;
        for (let i = 0; i < originalRows.length; i += batchSize) {
          const { error: insertError } = await this.supabase
            .from("transcript_segments")
            .insert(originalRows.slice(i, i + batchSize));
          if (insertError) throw insertError;
        }

        await this.updateJob(jobId, userId, {
          detected_language: languageLabel,
          media_duration_seconds: transcript.duration || durationSeconds,
          status: "creating_english",
          progress: 72,
          status_message: STATUS_LABELS.creating_english,
        });

        const refreshed = await this.getJob(userId, jobId);
        if (!refreshed) {
          throw new TranslatorError("NOT_FOUND", "Transcript job not found.");
        }
        await this.resumeTranslations(
          userId,
          jobId,
          refreshed,
          "creating_english"
        );
      } else {
        // Resume translation-only path when original segments already exist
        await this.resumeTranslations(userId, jobId, job, resumeFrom);
      }

      const finalJob = await this.getJob(userId, jobId);
      if (!finalJob) {
        throw new TranslatorError("NOT_FOUND", "Transcript job not found.");
      }
      return finalJob;
    } catch (error) {
      const mapped = mapProviderError(error);
      const currentStatus =
        (await this.getJob(userId, jobId))?.status || "failed";
      const failAt: TranscriptionJobStatus =
        currentStatus === "completed" || currentStatus === "failed"
          ? "transcribing"
          : currentStatus;
      await this.failJob(jobId, userId, failAt, mapped);
      throw mapped;
    } finally {
      await cleanupWorkDir(workDir);
    }
  }

  private async resumeTranslations(
    userId: string,
    jobId: string,
    job: TranscriptionJobWithSegments,
    resumeFrom: string
  ) {
    const originals = job.segments.map((s) => s.original_text);
    if (!originals.length) {
      throw new TranslatorError(
        "SPEECH_FAILED",
        "No transcript segments found to resume from."
      );
    }

    let englishTexts = job.segments.map((s) => s.english_text);
    const needsEnglish =
      resumeFrom === "creating_english" ||
      resumeFrom === "transcribing" ||
      englishTexts.some((t) => !t?.trim());

    if (needsEnglish) {
      await this.updateJob(jobId, userId, {
        status: "creating_english",
        progress: 72,
        status_message: STATUS_LABELS.creating_english,
        error_message: null,
        failed_step: null,
      });
      englishTexts = await this.translation.toEnglish({
        originalTexts: originals,
        detectedLanguage: job.detected_language,
      });
      for (let i = 0; i < job.segments.length; i += 1) {
        await this.supabase
          .from("transcript_segments")
          .update({ english_text: englishTexts[i] || "" })
          .eq("id", job.segments[i].id);
      }
    }

    const needsPersian =
      resumeFrom === "translating_persian" ||
      resumeFrom === "creating_english" ||
      resumeFrom === "finalizing" ||
      job.segments.some((s) => !s.persian_text?.trim());

    if (needsPersian) {
      await this.updateJob(jobId, userId, {
        status: "translating_persian",
        progress: 85,
        status_message: STATUS_LABELS.translating_persian,
        error_message: null,
        failed_step: null,
      });
      const persianTexts = await this.translation.toPersian(englishTexts);
      for (let i = 0; i < job.segments.length; i += 1) {
        await this.supabase
          .from("transcript_segments")
          .update({
            english_text: englishTexts[i] || job.segments[i].english_text,
            persian_text: persianTexts[i] || "",
          })
          .eq("id", job.segments[i].id);
      }
    }

    await this.updateJob(jobId, userId, {
      status: "completed",
      progress: 100,
      status_message: STATUS_LABELS.completed,
      error_message: null,
      failed_step: null,
      completed_at: new Date().toISOString(),
    });
  }

  async retry(userId: string, jobId: string): Promise<TranscriptionJobWithSegments> {
    const job = await this.getJob(userId, jobId);
    if (!job) {
      throw new TranslatorError("NOT_FOUND", "Transcript job not found.");
    }

    if (job.needs_upload && !job.storage_path) {
      throw new TranslatorError(
        "UNSUPPORTED_PLATFORM",
        "Upload a media file first, then try again."
      );
    }

    // If translation failed but originals exist, keep them and retry from failed step
    const failedStep = job.failed_step || "queued";
    const hasOriginals = job.segments.some((s) => s.original_text?.trim());

    await this.updateJob(jobId, userId, {
      status:
        hasOriginals &&
        (failedStep === "creating_english" ||
          failedStep === "translating_persian" ||
          failedStep === "finalizing")
          ? failedStep
          : "queued",
      progress: hasOriginals ? 70 : 0,
      status_message: "Retrying…",
      error_message: null,
    });

    return this.processJob(userId, jobId);
  }
}

export function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function buildExportText(
  job: TranscriptionJobWithSegments,
  mode: ExportMode
): string {
  const lines: string[] = [];
  lines.push(`Title: ${job.media_title || "Untitled"}`);
  lines.push(`Platform: ${platformLabel(job.source_platform)}`);
  lines.push(`Detected language: ${job.detected_language || "Unknown"}`);
  lines.push(`Duration: ${formatDuration(job.media_duration_seconds)}`);
  lines.push("");

  for (const segment of job.segments) {
    const ts = formatTimestamp(segment.start_time);
    if (ts) lines.push(ts);

    if (mode === "original") {
      lines.push(segment.original_text);
    } else if (mode === "english") {
      lines.push(segment.english_text);
    } else if (mode === "persian") {
      lines.push(segment.persian_text);
    } else {
      lines.push(`EN: ${segment.english_text}`);
      lines.push(`FA: ${segment.persian_text}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export { platformLabel, STATUS_LABELS };
