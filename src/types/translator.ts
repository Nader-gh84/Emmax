export const TRANSLATOR_MEDIA_BUCKET = "translator-media";
export const WHISPER_MAX_BYTES = 24 * 1024 * 1024; // stay under OpenAI 25 MB limit
export const MIN_AUDIO_SECONDS = 1;
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
export const AUDIO_CHUNK_SECONDS = 600; // 10 minutes per Whisper chunk
export const TRANSLATION_CHUNK_CHARS = 3500;

export const JOB_STATUSES = [
  "queued",
  "getting_media",
  "extracting_audio",
  "detecting_language",
  "transcribing",
  "creating_english",
  "translating_persian",
  "finalizing",
  "completed",
  "failed",
] as const;

export type TranscriptionJobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABELS: Record<TranscriptionJobStatus, string> = {
  queued: "Queued",
  getting_media: "Getting media",
  extracting_audio: "Extracting audio",
  detecting_language: "Detecting language",
  transcribing: "Transcribing",
  creating_english: "Creating English version",
  translating_persian: "Translating to Persian",
  finalizing: "Finalizing",
  completed: "Completed",
  failed: "Failed",
};

export type SourcePlatform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "twitter"
  | "vimeo"
  | "direct_audio"
  | "direct_video"
  | "podcast"
  | "upload"
  | "other";

export const PLATFORM_LABELS: Record<SourcePlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X / Twitter",
  vimeo: "Vimeo",
  direct_audio: "Direct Audio",
  direct_video: "Direct Video",
  podcast: "Podcast / Audio",
  upload: "Uploaded File",
  other: "Other supported source",
};

/** Platforms that typically block server-side media retrieval without special tooling. */
export const UPLOAD_FALLBACK_PLATFORMS: SourcePlatform[] = [
  "youtube",
  "tiktok",
  "instagram",
  "facebook",
  "twitter",
  "vimeo",
];

export const ACCEPTED_UPLOAD_EXTENSIONS = [
  ".mp3",
  ".m4a",
  ".wav",
  ".mp4",
  ".mov",
  ".webm",
  ".ogg",
  ".flac",
  ".mpeg",
  ".mpg",
  ".avi",
] as const;

export const ACCEPTED_UPLOAD_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
] as const;

export interface TranscriptSegment {
  id: string;
  job_id: string;
  sequence: number;
  start_time: number | null;
  end_time: number | null;
  speaker: string | null;
  original_text: string;
  english_text: string;
  persian_text: string;
  created_at?: string;
}

export interface TranscriptionJob {
  id: string;
  user_id: string;
  source_url: string | null;
  source_platform: SourcePlatform;
  media_title: string;
  storage_path: string | null;
  detected_language: string | null;
  media_duration_seconds: number | null;
  status: TranscriptionJobStatus;
  progress: number;
  status_message: string;
  error_message: string | null;
  failed_step: string | null;
  needs_upload: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TranscriptionJobWithSegments extends TranscriptionJob {
  segments: TranscriptSegment[];
}

export type ExportMode = "original" | "english" | "persian" | "english_persian";

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface WhisperVerboseResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: WhisperSegment[];
}
