import { scoreEntityMatch } from "@/lib/entity-resolve/score";
import {
  AMBIGUITY_GAP,
  HIGH_CONFIDENCE,
  SCORE_FLOOR,
  type EntityCandidate,
  type EntityKind,
  type EntityResolveResult,
  type RankedEntityMatch,
} from "@/lib/entity-resolve/types";

export function rankEntityMatches(
  query: string,
  candidates: EntityCandidate[],
  limit = 8
): RankedEntityMatch[] {
  const scored = candidates.map((c) => {
    const { score, signals } = scoreEntityMatch(query, c.label, c.meta);
    return { ...c, score, signals };
  });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.kind.localeCompare(b.kind) ||
      a.label.localeCompare(b.label)
  );

  // Always keep every scored row available via full list; slice only for options.
  void limit;
  return scored;
}

function formatDidYouMean(options: RankedEntityMatch[]): string {
  const labels = options.map((o) => o.label);
  if (labels.length === 1) return `Did you mean ${labels[0]}?`;
  if (labels.length === 2) {
    return `I found two — ${labels[0]} or ${labels[1]}?`;
  }
  const head = labels.slice(0, -1).join(", ");
  const last = labels[labels.length - 1];
  return `I found a few matches: ${head}, or ${last}?`;
}

function formatAvailableList(
  kind: EntityKind | "any",
  available: Array<{ label: string; kind: EntityKind }>
): string {
  const labels = available.map((a) => a.label);
  const kindLabel =
    kind === "any"
      ? "records"
      : kind === "customer"
        ? "customers"
        : kind === "supplier"
          ? "suppliers"
          : kind === "project"
            ? "projects"
            : "employees";

  if (labels.length === 0) {
    return `I couldn't find anyone matching that, and you don't have any ${kindLabel} yet.`;
  }

  const shown = labels.slice(0, 8);
  const more =
    labels.length > shown.length
      ? ` (and ${labels.length - shown.length} more)`
      : "";
  return `I couldn't find anyone matching that. Your ${kindLabel} are: ${shown.join(", ")}${more}.`;
}

/**
 * Decide accept / clarify / list-available from a full ranked list.
 * Never returns a dead-end "not found" without listing what IS available.
 */
export function resolveFromRanked(
  matches: RankedEntityMatch[],
  opts?: {
    kind?: EntityKind | "any";
    optionLimit?: number;
    /** When kind-specific search is weak, pass cross-kind ranked rows here. */
    crossKindRanked?: RankedEntityMatch[];
  }
): EntityResolveResult {
  const optionLimit = opts?.optionLimit ?? 5;
  const kind = opts?.kind ?? "any";
  const available = matches.map((m) => ({
    id: m.id,
    kind: m.kind,
    label: m.label,
  }));

  if (matches.length === 0) {
    return {
      needs_clarification: true,
      match: null,
      options: [],
      ranked: [],
      reason: "no_candidates",
      clarification: formatAvailableList(kind, []),
      available: [],
    };
  }

  const top = matches[0]!;
  const second = matches[1];
  const aboveFloor = matches.filter((m) => m.score >= SCORE_FLOOR);

  // Clear winner
  if (
    top.score >= HIGH_CONFIDENCE &&
    (!second || top.score - second.score >= AMBIGUITY_GAP)
  ) {
    return {
      needs_clarification: false,
      match: top,
      options: matches.slice(0, optionLimit),
      ranked: matches,
      reason: "resolved",
      clarification: null,
      available,
    };
  }

  // Ambiguous or mid confidence — ask
  if (aboveFloor.length >= 2) {
    const close = aboveFloor.filter(
      (m) => top.score - m.score < AMBIGUITY_GAP + 4
    );
    const options = (close.length >= 2 ? close : aboveFloor).slice(
      0,
      optionLimit
    );
    return {
      needs_clarification: true,
      match: null,
      options,
      ranked: matches,
      reason: "ambiguous",
      clarification: formatDidYouMean(options),
      available,
    };
  }

  if (aboveFloor.length === 1 && top.score >= SCORE_FLOOR) {
    // Single plausible match but not high confidence — confirm
    if (top.score < HIGH_CONFIDENCE) {
      return {
        needs_clarification: true,
        match: null,
        options: [top],
        ranked: matches,
        reason: "low_confidence",
        clarification: formatDidYouMean([top]),
        available,
      };
    }
  }

  // Try cross-kind suggestions before giving up
  const cross = (opts?.crossKindRanked ?? []).filter(
    (m) => m.score >= SCORE_FLOOR
  );
  if (cross.length > 0) {
    const options = cross.slice(0, optionLimit);
    return {
      needs_clarification: true,
      match: null,
      options,
      ranked: matches,
      reason: "low_confidence",
      clarification: formatDidYouMean(options),
      available,
    };
  }

  // Below floor — never dead-end; list what exists
  return {
    needs_clarification: true,
    match: null,
    options: matches.slice(0, optionLimit),
    ranked: matches,
    reason: "below_floor",
    clarification: formatAvailableList(
      kind,
      available.map((a) => ({ label: a.label, kind: a.kind }))
    ),
    available,
  };
}

export function resolveEntityQuery(
  query: string,
  candidates: EntityCandidate[],
  opts?: {
    kind?: EntityKind | "any";
    optionLimit?: number;
    crossKindCandidates?: EntityCandidate[];
  }
): EntityResolveResult {
  const ranked = rankEntityMatches(query, candidates);
  const primary = resolveFromRanked(ranked, {
    kind: opts?.kind,
    optionLimit: opts?.optionLimit,
  });

  // Clear hit within the requested kind — done.
  if (primary.reason === "resolved") {
    return primary;
  }

  // Ambiguous within kind — still useful; don't bury with other kinds unless
  // primary was below floor / empty.
  if (primary.reason === "ambiguous" && ranked.some((m) => m.score >= SCORE_FLOOR)) {
    return primary;
  }

  // Weak or empty primary match: fold in other entity kinds (e.g. a project
  // named like a person, or a job title spoken when kind=customer).
  if (opts?.crossKindCandidates?.length) {
    const crossRanked = rankEntityMatches(query, opts.crossKindCandidates);
    const byId = new Map<string, RankedEntityMatch>();
    for (const row of [...ranked, ...crossRanked]) {
      const prev = byId.get(row.id);
      if (!prev || row.score > prev.score) byId.set(row.id, row);
    }
    const merged = Array.from(byId.values()).sort(
      (a, b) =>
        b.score - a.score ||
        a.kind.localeCompare(b.kind) ||
        a.label.localeCompare(b.label)
    );
    return resolveFromRanked(merged, {
      kind: "any",
      optionLimit: opts?.optionLimit,
    });
  }

  return primary;
}
