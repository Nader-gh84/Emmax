/**
 * Em Call entity resolve — thin re-export of the shared voice-tolerant matcher.
 * Prefer importing from `@/lib/entity-resolve` for new code.
 */
export type {
  EntityCandidate,
  EntityKind,
  RankedEntityMatch,
} from "@/lib/entity-resolve";
export {
  rankEntityMatches,
  resolveEntityQuery,
  resolveFromRanked,
  scoreEntityMatch as scoreEntityMatchDetailed,
} from "@/lib/entity-resolve";

import { scoreEntityMatch as scoreDetailed } from "@/lib/entity-resolve";

/** @deprecated Prefer scoreEntityMatch from @/lib/entity-resolve (returns signals). */
export function scoreEntityMatch(
  query: string,
  label: string,
  meta?: string | null
): number {
  return scoreDetailed(query, label, meta).score;
}
