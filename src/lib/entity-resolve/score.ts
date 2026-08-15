import { jaroWinkler } from "@/lib/entity-resolve/jaro-winkler";
import { levenshteinSimilarity } from "@/lib/entity-resolve/levenshtein";
import {
  normalizeEntityText,
  tokenizeEntityName,
} from "@/lib/entity-resolve/normalize";
import { phoneticCodesMatch } from "@/lib/entity-resolve/phonetic";

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const shorter = Math.min(a.length, b.length);
  const longer = Math.max(a.length, b.length);
  const lengthRatio = shorter / longer;

  const jw = jaroWinkler(a, b);
  const lev = levenshteinSimilarity(a, b);
  let sim = Math.max(jw, lev * 0.95 + jw * 0.05);

  // Jaro-Winkler alone overrates unrelated short strings — demand
  // edit-distance support or a strong length ratio.
  if (lev < 0.55 && lengthRatio < 0.7) {
    sim = Math.min(sim, lev * 0.7 + jw * 0.2);
  }

  // Very different lengths without shared prefix → hard cap
  if (lengthRatio < 0.45 && !a.startsWith(b.slice(0, 2)) && !b.startsWith(a.slice(0, 2))) {
    sim = Math.min(sim, 0.4);
  }

  return sim;
}

function bestTokenPairScore(queryTokens: string[], labelTokens: string[]): number {
  if (queryTokens.length === 0 || labelTokens.length === 0) return 0;

  const perQuery: number[] = [];
  for (const qt of queryTokens) {
    let best = 0;
    for (const lt of labelTokens) {
      let s = stringSimilarity(qt, lt);
      const phonetic = phoneticCodesMatch(qt, lt);
      if (phonetic) {
        // Phonetic hit is strong for voice, but still require some string overlap
        // so "Xylophone" doesn't match "Kristina" via coincidence.
        const lev = levenshteinSimilarity(qt, lt);
        const jw = jaroWinkler(qt, lt);
        s = Math.max(s, Math.min(0.92, 0.72 + Math.max(lev, jw) * 0.25));
      }
      // Prefix / containment for truncated Whisper output
      if (lt.length >= 3 && qt.length >= 2 && (lt.startsWith(qt) || qt.startsWith(lt))) {
        s = Math.max(s, 0.82);
      }
      // Exact token after normalize
      if (qt === lt) s = 1;
      best = Math.max(best, s);
    }
    perQuery.push(best);
  }

  const mean = perQuery.reduce((a, b) => a + b, 0) / perQuery.length;
  const allStrong = perQuery.every((s) => s >= 0.78);
  return allStrong ? Math.min(1, mean + 0.05) : mean;
}

function phoneticCoverage(queryTokens: string[], labelTokens: string[]): number {
  if (queryTokens.length === 0 || labelTokens.length === 0) return 0;
  let hits = 0;
  for (const qt of queryTokens) {
    if (labelTokens.some((lt) => phoneticCodesMatch(qt, lt))) hits += 1;
  }
  return hits / queryTokens.length;
}

/**
 * Score 0–100 how well a spoken query matches an entity label (+ optional meta).
 * Always returns a number — even weak matches get a low score (never skip scoring).
 */
export function scoreEntityMatch(
  query: string,
  label: string,
  meta?: string | null
): { score: number; signals: { full: number; parts: number; phonetic: number } } {
  const qNorm = normalizeEntityText(query);
  const labelNorm = normalizeEntityText(label);
  const metaNorm = meta ? normalizeEntityText(meta) : "";
  const hayNorm = [labelNorm, metaNorm].filter(Boolean).join(" ");

  if (!qNorm || !hayNorm) {
    return { score: 0, signals: { full: 0, parts: 0, phonetic: 0 } };
  }

  if (qNorm === labelNorm || qNorm === hayNorm) {
    return { score: 100, signals: { full: 100, parts: 100, phonetic: 100 } };
  }

  const qTokens = tokenizeEntityName(qNorm);
  const labelTokens = tokenizeEntityName(labelNorm);
  const hayTokens = tokenizeEntityName(hayNorm);

  const fullSim = stringSimilarity(qNorm, labelNorm);
  const haySim = stringSimilarity(qNorm, hayNorm);
  const full = Math.round(Math.max(fullSim, haySim) * 100);

  const partsRatio = bestTokenPairScore(qTokens, hayTokens);
  const parts = Math.round(partsRatio * 100);

  const phonRatio = Math.max(
    phoneticCoverage(qTokens, labelTokens),
    phoneticCoverage(qTokens, hayTokens)
  );
  const phonetic = Math.round(phonRatio * 100);

  // Combine: parts dominate for first-name-only queries; full helps whole-name.
  let combined = Math.max(full * 0.9, parts);
  if (phonetic >= 80) {
    combined = Math.max(combined, Math.min(92, parts * 0.55 + phonetic * 0.45));
  } else if (phonetic >= 50) {
    combined = Math.max(combined, combined * 0.85 + phonetic * 0.15);
  }

  // Single-token query matching one name part strongly
  if (qTokens.length === 1 && parts >= 82) {
    combined = Math.max(combined, parts);
  }

  // Contained phrase (normalized)
  if (hayNorm.includes(qNorm) && qNorm.length >= 3) {
    combined = Math.max(combined, 88);
  }

  const score = Math.max(0, Math.min(100, Math.round(combined)));
  return { score, signals: { full, parts, phonetic } };
}
