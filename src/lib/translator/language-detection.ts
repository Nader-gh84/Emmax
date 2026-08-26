const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  eng: "English",
  english: "English",
  fr: "French",
  fra: "French",
  fre: "French",
  french: "French",
  es: "Spanish",
  spa: "Spanish",
  spanish: "Spanish",
  ar: "Arabic",
  ara: "Arabic",
  arabic: "Arabic",
  fa: "Persian",
  fas: "Persian",
  per: "Persian",
  persian: "Persian",
  farsi: "Persian",
  tr: "Turkish",
  tur: "Turkish",
  turkish: "Turkish",
  it: "Italian",
  ita: "Italian",
  italian: "Italian",
  de: "German",
  deu: "German",
  ger: "German",
  german: "German",
  pt: "Portuguese",
  por: "Portuguese",
  portuguese: "Portuguese",
  ru: "Russian",
  rus: "Russian",
  russian: "Russian",
  zh: "Chinese",
  zho: "Chinese",
  chi: "Chinese",
  chinese: "Chinese",
  ja: "Japanese",
  jpn: "Japanese",
  japanese: "Japanese",
  ko: "Korean",
  kor: "Korean",
  korean: "Korean",
  hi: "Hindi",
  hin: "Hindi",
  hindi: "Hindi",
  nl: "Dutch",
  nld: "Dutch",
  dutch: "Dutch",
  pl: "Polish",
  pol: "Polish",
  polish: "Polish",
  uk: "Ukrainian",
  ukr: "Ukrainian",
  ukrainian: "Ukrainian",
  sv: "Swedish",
  swe: "Swedish",
  swedish: "Swedish",
  he: "Hebrew",
  heb: "Hebrew",
  hebrew: "Hebrew",
  id: "Indonesian",
  ind: "Indonesian",
  indonesian: "Indonesian",
  vi: "Vietnamese",
  vie: "Vietnamese",
  vietnamese: "Vietnamese",
  th: "Thai",
  tha: "Thai",
  thai: "Thai",
};

export class LanguageDetectionService {
  /** Normalize Whisper language codes / names to a display label. */
  toDisplayName(codeOrName: string | null | undefined): string {
    if (!codeOrName) return "Unknown";
    const key = codeOrName.trim().toLowerCase();
    return LANGUAGE_NAMES[key] || capitalize(codeOrName.trim());
  }

  isEnglish(codeOrName: string | null | undefined): boolean {
    if (!codeOrName) return false;
    const key = codeOrName.trim().toLowerCase();
    return LANGUAGE_NAMES[key] === "English" || key === "en" || key === "english";
  }
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
