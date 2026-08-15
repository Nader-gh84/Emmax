/**
 * Shared voice-tolerant entity resolution.
 * Built for imperfect Whisper transcripts of proper nouns.
 */

export type EntityKind = "customer" | "supplier" | "project" | "employee";

export type EntityResolveKind = EntityKind | "any";

export type EntityCandidate = {
  id: string;
  kind: EntityKind;
  label: string;
  /** Optional secondary text (email, customer on a project, etc.). */
  meta?: string | null;
};

export type RankedEntityMatch = EntityCandidate & {
  score: number;
  /** Breakdown for debugging / tests. */
  signals?: {
    full: number;
    parts: number;
    phonetic: number;
  };
};

export type EntityResolveResult = {
  needs_clarification: boolean;
  match: RankedEntityMatch | null;
  options: RankedEntityMatch[];
  /** All scored candidates (sorted), including low scores — never empty when candidates exist. */
  ranked: RankedEntityMatch[];
  reason:
    | "resolved"
    | "ambiguous"
    | "low_confidence"
    | "no_candidates"
    | "below_floor";
  /** Short spoken/UI clarification. Always set when needs_clarification. */
  clarification: string | null;
  /** Full roster for the searched kind(s) when nothing matched well. */
  available: Array<{ id: string; kind: EntityKind; label: string }>;
};

/** Accept as clear winner. */
export const HIGH_CONFIDENCE = 78;
/** Minimum score to surface as a possible match / ask about. */
export const SCORE_FLOOR = 55;
/** Top two must differ by at least this to auto-accept. */
export const AMBIGUITY_GAP = 10;
