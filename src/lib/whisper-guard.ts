/**
 * Guard against Whisper silence hallucinations.
 * Used by /api/transcribe after verbose_json transcription.
 */

const CJK_RE =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;

/** Common Whisper silence / YouTube-outro artifacts (English). */
const SILENCE_ARTIFACT_PHRASES = [
  "thank you",
  "thank you.",
  "thanks",
  "thanks.",
  "thanks for watching",
  "thanks for watching!",
  "thank you for watching",
  "thank you for watching!",
  "please subscribe",
  "please subscribe.",
  "subscribe",
  "like and subscribe",
  "see you next time",
  "see you next time.",
  "bye",
  "bye.",
  "goodbye",
  "goodbye.",
  "you",
  "you.",
  "the end",
  "the end.",
  "字幕",
  "ご視聴ありがとう",
  "ご視聴ありがとうございました",
] as const;

export type WhisperVerboseResult = {
  text?: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    text?: string;
    avg_logprob?: number;
    no_speech_prob?: number;
  }>;
};

export type WhisperGuardRejectReason =
  | "empty"
  | "cjk"
  | "artifact"
  | "no_speech_prob"
  | "avg_logprob";

export type WhisperGuardResult =
  | { ok: true; transcript: string }
  | { ok: false; reason: WhisperGuardRejectReason };

function normalizePhrase(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
}

function isPunctuationOnly(text: string): boolean {
  return text.replace(/[\s.,!?;:'"`~@#$%^&*()\-_+=[\]{}|\\/<>]+/g, "").length === 0;
}

function matchesSilenceArtifact(text: string): boolean {
  const normalized = normalizePhrase(text);
  if (!normalized) return true;
  return SILENCE_ARTIFACT_PHRASES.some((phrase) => normalized === phrase);
}

function aggregateSegmentScores(result: WhisperVerboseResult): {
  maxNoSpeechProb: number | null;
  meanAvgLogprob: number | null;
} {
  const segments = result.segments ?? [];
  if (segments.length === 0) {
    return { maxNoSpeechProb: null, meanAvgLogprob: null };
  }

  let maxNoSpeech = -Infinity;
  let logprobSum = 0;
  let logprobCount = 0;

  for (const segment of segments) {
    if (typeof segment.no_speech_prob === "number") {
      maxNoSpeech = Math.max(maxNoSpeech, segment.no_speech_prob);
    }
    if (typeof segment.avg_logprob === "number") {
      logprobSum += segment.avg_logprob;
      logprobCount += 1;
    }
  }

  return {
    maxNoSpeechProb: Number.isFinite(maxNoSpeech) ? maxNoSpeech : null,
    meanAvgLogprob: logprobCount > 0 ? logprobSum / logprobCount : null,
  };
}

/**
 * Reject empty / CJK / known silence phrases / low-confidence Whisper output.
 * Thresholds are intentionally conservative so real short utterances still pass.
 */
export function guardWhisperTranscript(
  result: WhisperVerboseResult
): WhisperGuardResult {
  const transcript = (result.text ?? "").trim();

  if (!transcript || isPunctuationOnly(transcript)) {
    return { ok: false, reason: "empty" };
  }

  if (CJK_RE.test(transcript)) {
    return { ok: false, reason: "cjk" };
  }

  if (matchesSilenceArtifact(transcript)) {
    return { ok: false, reason: "artifact" };
  }

  const { maxNoSpeechProb, meanAvgLogprob } = aggregateSegmentScores(result);

  // High probability the clip had no speech
  if (maxNoSpeechProb !== null && maxNoSpeechProb >= 0.6) {
    return { ok: false, reason: "no_speech_prob" };
  }

  // Very low confidence transcription (common on noise / silence)
  if (meanAvgLogprob !== null && meanAvgLogprob <= -1.0) {
    return { ok: false, reason: "avg_logprob" };
  }

  return { ok: true, transcript };
}

export const NO_SPEECH_USER_MESSAGE =
  "I didn't catch that — could you say it again?";

/** Minimum accumulated non-silent audio before we bother calling Whisper. */
export const MIN_SPEECH_DURATION_MS = 500;
