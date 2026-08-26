/**
 * Video & Audio Translator — modular AI / media services.
 * UI components should call API routes; routes use these services.
 */
export { MediaExtractorService } from "@/lib/translator/media-extractor";
export { SpeechToTextService } from "@/lib/translator/speech-to-text";
export { LanguageDetectionService } from "@/lib/translator/language-detection";
export { TranslationService } from "@/lib/translator/translation";
export { TranscriptJobService } from "@/lib/translator/job-service";
export { TranslatorError } from "@/lib/translator/errors";
