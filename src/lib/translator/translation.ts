import { TRANSLATION_CHUNK_CHARS } from "@/types/translator";
import { TranslatorError, mapProviderError } from "@/lib/translator/errors";
import { LanguageDetectionService } from "@/lib/translator/language-detection";

function getOpenAiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new TranslatorError(
      "PROVIDER_OUTAGE",
      "Translation is not configured. Set OPENAI_API_KEY."
    );
  }
  return key;
}

async function chatTranslate(
  system: string,
  user: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw mapProviderError(new Error(`Translation failed: ${text}`));
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new TranslatorError(
      "TRANSLATION_FAILED",
      "Translation returned an empty result."
    );
  }
  return content.trim();
}

/**
 * Translate an array of segments in batches while preserving count/order.
 * Returns one translated string per input segment.
 */
async function translateSegmentBatch(
  texts: string[],
  system: string,
  apiKey: string
): Promise<string[]> {
  if (texts.length === 0) return [];

  const batches: string[][] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const text of texts) {
    if (
      current.length > 0 &&
      currentChars + text.length > TRANSLATION_CHUNK_CHARS
    ) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(text);
    currentChars += text.length;
  }
  if (current.length) batches.push(current);

  const output: string[] = [];

  for (const batch of batches) {
    const numbered = batch
      .map((text, index) => `[${index + 1}] ${text}`)
      .join("\n\n");

    const raw = await chatTranslate(
      `${system}

You will receive numbered segments like [1] ... [2] ...
Return the same number of segments, each on its own block, keeping the [n] prefixes.
Translate faithfully. Do NOT summarize. Do NOT omit repeated sentences.
Preserve paragraph meaning. Keep numbers and names when appropriate.`,
      numbered,
      apiKey
    );

    const parsed = parseNumberedBlocks(raw, batch.length);
    output.push(...parsed);
  }

  return output;
}

function parseNumberedBlocks(raw: string, expected: number): string[] {
  const matches: RegExpExecArray[] = [];
  const pattern = /\[(\d+)\]\s*([\s\S]*?)(?=\n\s*\[\d+\]|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    matches.push(match);
  }
  if (matches.length >= expected) {
    return matches.slice(0, expected).map((m) => m[2].trim());
  }

  // Fallback: split by blank lines if model ignored numbering.
  const parts = raw
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^\[\d+\]\s*/, "").trim())
    .filter(Boolean);

  if (parts.length === expected) return parts;

  // Last resort: pad/truncate to keep pipeline alive.
  const result = parts.slice(0, expected);
  while (result.length < expected) {
    result.push(parts[parts.length - 1] || "");
  }
  return result;
}

export class TranslationService {
  private languages = new LanguageDetectionService();

  async toEnglish(params: {
    originalTexts: string[];
    detectedLanguage: string | null;
  }): Promise<string[]> {
    const apiKey = getOpenAiKey();

    if (this.languages.isEnglish(params.detectedLanguage)) {
      return params.originalTexts.map((t) => t);
    }

    try {
      return await translateSegmentBatch(
        params.originalTexts,
        `Translate each segment into clear, natural English.
The source language is approximately: ${params.detectedLanguage || "unknown"}.
Keep the full content. Never summarize.`,
        apiKey
      );
    } catch (error) {
      throw mapProviderError(error);
    }
  }

  async toPersian(englishTexts: string[]): Promise<string[]> {
    const apiKey = getOpenAiKey();
    try {
      return await translateSegmentBatch(
        englishTexts,
        `Translate each English segment into fluent, natural Persian (Farsi).
Preserve the full meaning. Do not summarize. Use clear modern Persian.`,
        apiKey
      );
    } catch (error) {
      throw mapProviderError(error);
    }
  }
}
