export type TranslatorErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_PLATFORM"
  | "PRIVATE"
  | "DELETED"
  | "LOGIN_REQUIRED"
  | "GEO_RESTRICTED"
  | "NO_AUDIO"
  | "AUDIO_TOO_SHORT"
  | "AUDIO_TOO_LARGE"
  | "RETRIEVAL_FAILED"
  | "SPEECH_FAILED"
  | "TRANSLATION_FAILED"
  | "RATE_LIMIT"
  | "PROVIDER_OUTAGE"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "EXTRACT_FAILED"
  | "UNKNOWN";

export class TranslatorError extends Error {
  code: TranslatorErrorCode;
  retryable: boolean;

  constructor(
    code: TranslatorErrorCode,
    message: string,
    options?: { retryable?: boolean }
  ) {
    super(message);
    this.name = "TranslatorError";
    this.code = code;
    this.retryable = options?.retryable ?? true;
  }
}

export function mapProviderError(error: unknown): TranslatorError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (error instanceof TranslatorError) return error;

  if (lower.includes("429") || lower.includes("rate limit")) {
    return new TranslatorError(
      "RATE_LIMIT",
      "The speech service is busy right now. Please try again in a moment.",
      { retryable: true }
    );
  }
  if (
    lower.includes("500") ||
    lower.includes("502") ||
    lower.includes("503") ||
    lower.includes("overloaded")
  ) {
    return new TranslatorError(
      "PROVIDER_OUTAGE",
      "The AI service is temporarily unavailable. Please try again shortly.",
      { retryable: true }
    );
  }
  if (lower.includes("transcri")) {
    return new TranslatorError(
      "SPEECH_FAILED",
      "Speech recognition failed. You can try again without restarting.",
      { retryable: true }
    );
  }
  if (lower.includes("translat")) {
    return new TranslatorError(
      "TRANSLATION_FAILED",
      "Translation failed. You can retry translation without re-transcribing.",
      { retryable: true }
    );
  }

  return new TranslatorError("UNKNOWN", message || "Something went wrong.", {
    retryable: true,
  });
}
