export type {
  EntityCandidate,
  EntityKind,
  EntityResolveKind,
  EntityResolveResult,
  RankedEntityMatch,
} from "@/lib/entity-resolve/types";
export {
  AMBIGUITY_GAP,
  HIGH_CONFIDENCE,
  SCORE_FLOOR,
} from "@/lib/entity-resolve/types";
export { normalizeEntityText, tokenizeEntityName } from "@/lib/entity-resolve/normalize";
export { levenshtein, levenshteinSimilarity } from "@/lib/entity-resolve/levenshtein";
export { jaroWinkler } from "@/lib/entity-resolve/jaro-winkler";
export { doubleMetaphone, phoneticCodesMatch } from "@/lib/entity-resolve/phonetic";
export { scoreEntityMatch } from "@/lib/entity-resolve/score";
export {
  rankEntityMatches,
  resolveEntityQuery,
  resolveFromRanked,
} from "@/lib/entity-resolve/resolve";
