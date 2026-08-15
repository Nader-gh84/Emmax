export type EntityKind = "customer" | "supplier" | "project" | "employee";

export type EntityCandidate = {
  id: string;
  kind: EntityKind;
  label: string;
  meta?: string | null;
};

export type RankedEntityMatch = EntityCandidate & {
  score: number;
};

const MIN_ACCEPT_SCORE = 55;
const AMBIGUITY_GAP = 12;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

/** Score 0–100 how well query matches a label (and optional meta). */
export function scoreEntityMatch(query: string, label: string, meta?: string | null): number {
  const q = normalize(query);
  if (!q) return 0;
  const hay = normalize(`${label} ${meta ?? ""}`);
  if (!hay) return 0;

  if (hay === q) return 100;
  if (hay.startsWith(q) || label.toLowerCase().startsWith(q)) return 92;
  if (hay.includes(q)) return 80;

  const qTokens = tokens(q);
  const hTokens = tokens(hay);
  const hSet = new Set(hTokens);
  if (qTokens.length === 0) return 0;

  let hits = 0;
  for (const t of qTokens) {
    if (hSet.has(t)) hits += 1;
    else if (hTokens.some((h) => h.startsWith(t) || t.startsWith(h))) hits += 0.6;
  }
  const ratio = hits / qTokens.length;
  return Math.round(ratio * 70);
}

export function rankEntityMatches(
  query: string,
  candidates: EntityCandidate[],
  limit = 5
): RankedEntityMatch[] {
  return candidates
    .map((c) => ({
      ...c,
      score: scoreEntityMatch(query, c.label, c.meta),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, Math.max(1, limit));
}

export function resolveFromRanked(matches: RankedEntityMatch[]): {
  needs_clarification: boolean;
  match: RankedEntityMatch | null;
  options: RankedEntityMatch[];
  reason: string | null;
} {
  if (matches.length === 0) {
    return {
      needs_clarification: true,
      match: null,
      options: [],
      reason: "no_match",
    };
  }

  const top = matches[0]!;
  const second = matches[1];

  if (top.score < MIN_ACCEPT_SCORE) {
    return {
      needs_clarification: true,
      match: null,
      options: matches.slice(0, 5),
      reason: "low_confidence",
    };
  }

  if (second && top.score - second.score < AMBIGUITY_GAP) {
    return {
      needs_clarification: true,
      match: null,
      options: matches.slice(0, 5),
      reason: "ambiguous",
    };
  }

  return {
    needs_clarification: false,
    match: top,
    options: matches.slice(0, 5),
    reason: null,
  };
}
