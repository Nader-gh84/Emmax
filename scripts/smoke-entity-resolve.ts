/**
 * Smoke + regression: voice-tolerant entity resolve.
 * Covers Whisper-style mangling of real-ish contractor names.
 *
 * Run: npx tsx scripts/smoke-entity-resolve.ts
 */
import {
  resolveEntityQuery,
  scoreEntityMatch,
  type EntityCandidate,
} from "../src/lib/entity-resolve";

const fixtures: EntityCandidate[] = [
  {
    id: "c-david",
    kind: "customer",
    label: "David Klein",
    meta: null,
  },
  {
    id: "c-sara-emma",
    kind: "customer",
    label: "Sara Emma",
    meta: null,
  },
  {
    id: "c-sara-ahmadi",
    kind: "customer",
    label: "Sara Ahmadi",
    meta: null,
  },
  {
    id: "c-kristina",
    kind: "customer",
    label: "Kristina Lambert",
    meta: null,
  },
  {
    id: "p-kristina-kitchen",
    kind: "project",
    label: "Kristina Lambert ( kitchen Renovation )",
    meta: "David Klein",
  },
  {
    id: "c-pari",
    kind: "customer",
    label: "Pari Nazari",
    meta: null,
  },
  {
    id: "s-rona",
    kind: "supplier",
    label: "Rona",
    meta: null,
  },
  {
    id: "e-ces",
    kind: "employee",
    label: "Ces Martinez",
    meta: "carpenter",
  },
];

type Expectation =
  | { type: "resolve"; id: string }
  | { type: "clarify"; mustIncludeIds?: string[]; mustMention?: string }
  | { type: "list_available" };

const cases: Array<{
  name: string;
  query: string;
  kind: "customer" | "supplier" | "project" | "employee" | "any";
  expect: Expectation;
}> = [
  // Emma ↔ Ema — unique match against Sara Emma should resolve, not dead-end
  {
    name: "Emma → Sara Emma (phonetic / short edit)",
    query: "Emma",
    kind: "customer",
    expect: { type: "resolve", id: "c-sara-emma" },
  },
  {
    name: "Ema → Sara Emma (assistant name must not be filtered)",
    query: "Ema",
    kind: "customer",
    expect: { type: "resolve", id: "c-sara-emma" },
  },
  {
    name: "Sara Emma exact",
    query: "Sara Emma",
    kind: "customer",
    expect: { type: "resolve", id: "c-sara-emma" },
  },
  {
    name: "Sara Emna (doubled/swapped letter)",
    query: "Sara Emna",
    kind: "customer",
    expect: { type: "resolve", id: "c-sara-emma" },
  },

  // Kristina ↔ Cristina (C/K)
  {
    name: "Cristina → Kristina Lambert",
    query: "Cristina",
    kind: "customer",
    expect: { type: "resolve", id: "c-kristina" },
  },
  {
    name: "Christina Lambert",
    query: "Christina Lambert",
    kind: "customer",
    expect: { type: "resolve", id: "c-kristina" },
  },
  {
    name: "Kristina as project (cross-kind / any)",
    query: "Kristina Lambert",
    kind: "any",
    expect: {
      type: "clarify",
      mustIncludeIds: ["c-kristina", "p-kristina-kitchen"],
    },
  },
  {
    name: "Cristina kitchen project via any",
    query: "Cristina kitchen",
    kind: "project",
    expect: { type: "resolve", id: "p-kristina-kitchen" },
  },

  // David Klein mangling
  {
    name: "David Kline (phonetic last name)",
    query: "David Kline",
    kind: "customer",
    expect: { type: "resolve", id: "c-david" },
  },
  {
    name: "Daveed Klein",
    query: "Daveed Klein",
    kind: "customer",
    expect: { type: "resolve", id: "c-david" },
  },
  {
    name: "Klein alone (last name partial)",
    query: "Klein",
    kind: "customer",
    expect: { type: "resolve", id: "c-david" },
  },

  // Ambiguity: two Saras
  {
    name: "Sara alone → ask which Sara",
    query: "Sara",
    kind: "customer",
    expect: {
      type: "clarify",
      mustIncludeIds: ["c-sara-emma", "c-sara-ahmadi"],
    },
  },

  // S/Z, PH/F style
  {
    name: "Pari Nazari exact-ish",
    query: "Pari",
    kind: "customer",
    expect: { type: "resolve", id: "c-pari" },
  },
  {
    name: "Perry Nazari (phonetic)",
    query: "Perry Nazari",
    kind: "customer",
    expect: { type: "resolve", id: "c-pari" },
  },
  {
    name: "Rona supplier",
    query: "Rona",
    kind: "supplier",
    expect: { type: "resolve", id: "s-rona" },
  },
  {
    name: "Ces employee",
    query: "Ces",
    kind: "employee",
    expect: { type: "resolve", id: "e-ces" },
  },
  {
    name: "Sez Martinez (S/Z)",
    query: "Sez Martinez",
    kind: "employee",
    expect: { type: "resolve", id: "e-ces" },
  },
  {
    name: "Sess Martinez (near miss)",
    query: "Sess Martinez",
    kind: "employee",
    expect: { type: "resolve", id: "e-ces" },
  },
  {
    name: "Dropped letter Kristna",
    query: "Kristna Lambert",
    kind: "customer",
    expect: { type: "resolve", id: "c-kristina" },
  },
  {
    name: "Doubled letter Davvid",
    query: "Davvid Klein",
    kind: "customer",
    expect: { type: "resolve", id: "c-david" },
  },
  {
    name: "Customer kind with project-only name still cross-suggests",
    query: "kitchen Renovation",
    kind: "customer",
    expect: { type: "resolve", id: "p-kristina-kitchen" },
  },

  // Below floor → list available, never bare not-found
  {
    name: "Garbage query lists customers",
    query: "Xylophone Quokka",
    kind: "customer",
    expect: { type: "list_available" },
  },
];

function candidatesFor(
  kind: "customer" | "supplier" | "project" | "employee" | "any"
): EntityCandidate[] {
  if (kind === "any") return fixtures;
  return fixtures.filter((f) => f.kind === kind);
}

function crossKindFor(
  kind: "customer" | "supplier" | "project" | "employee" | "any"
): EntityCandidate[] | undefined {
  if (kind === "any") return undefined;
  return fixtures.filter((f) => f.kind !== kind);
}

let failed = 0;

for (const tc of cases) {
  const resolved = resolveEntityQuery(tc.query, candidatesFor(tc.kind), {
    kind: tc.kind,
    optionLimit: 5,
    crossKindCandidates: crossKindFor(tc.kind),
  });

  const topScore = resolved.ranked[0]?.score ?? 0;
  let ok = false;
  let detail = "";

  if (tc.expect.type === "resolve") {
    ok =
      !resolved.needs_clarification &&
      resolved.match?.id === tc.expect.id &&
      resolved.reason === "resolved";
    detail = `match=${resolved.match?.id ?? "null"} score=${resolved.match?.score ?? topScore} reason=${resolved.reason}`;
  } else if (tc.expect.type === "clarify") {
    ok =
      resolved.needs_clarification &&
      !!resolved.clarification &&
      !/technical|error|stack/i.test(resolved.clarification) &&
      resolved.reason !== "below_floor";
    if (ok && tc.expect.mustIncludeIds) {
      const ids = new Set(resolved.options.map((o) => o.id));
      ok = tc.expect.mustIncludeIds.every((id) => ids.has(id));
    }
    if (ok && tc.expect.mustMention) {
      ok = (resolved.clarification ?? "")
        .toLowerCase()
        .includes(tc.expect.mustMention.toLowerCase());
    }
    detail = `reason=${resolved.reason} options=${resolved.options
      .map((o) => `${o.id}:${o.score}`)
      .join(",")} clarification=${JSON.stringify(resolved.clarification)}`;
  } else {
    ok =
      resolved.needs_clarification &&
      resolved.reason === "below_floor" &&
      !!resolved.clarification &&
      /your (customers|suppliers|projects|employees|records) are:/i.test(
        resolved.clarification
      ) &&
      resolved.available.length > 0;
    detail = `reason=${resolved.reason} clarification=${JSON.stringify(resolved.clarification)}`;
  }

  // Hard rule: never a dead-end with no clarification when candidates exist
  if (!resolved.clarification && resolved.needs_clarification) {
    ok = false;
    detail += " (missing clarification)";
  }

  const mark = ok ? "PASS" : "FAIL";
  if (!ok) failed += 1;
  console.log(`${mark}  [${tc.name}] q=${JSON.stringify(tc.query)}  ${detail}`);
}

// Spot-check raw scores for the two original bugs
const emma = scoreEntityMatch("Emma", "Sara Emma");
const cristina = scoreEntityMatch("Cristina", "Kristina Lambert");
console.log("\nScore spot checks:");
console.log(`  Emma → Sara Emma: ${emma.score}`, emma.signals);
console.log(`  Cristina → Kristina Lambert: ${cristina.score}`, cristina.signals);

if (failed > 0) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${cases.length} cases passed.`);
