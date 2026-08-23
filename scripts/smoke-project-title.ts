/**
 * Smoke tests for projectTitle parsing/normalization.
 * With OPENAI_API_KEY set, also runs live GPT extraction on sample utterances.
 *
 *   npx tsx scripts/smoke-project-title.ts
 */
import {
  QUOTE_EXTRACTION_SYSTEM_PROMPT,
  mapExtractionToLineItems,
  normalizeProjectTitle,
} from "../src/lib/quote-extraction";

type Case = { input: string; expected: string };

const NORMALIZE_CASES: Case[] = [
  {
    input: "The PO is Kitchen Innovation, the owner is Sarah Del",
    expected: "Kitchen Innovation — Sarah Del",
  },
  {
    input: "This is for the kitchen renovation at Sara Emma's place",
    expected: "Kitchen renovation — Sara Emma",
  },
  {
    input: "Basement rewiring for David Klein",
    expected: "Basement rewiring — David Klein",
  },
  {
    input: "Kitchen Innovation — Sarah Del",
    expected: "Kitchen Innovation — Sarah Del",
  },
  {
    input: "Smith bathroom job",
    expected: "Smith bathroom",
  },
  {
    input: "",
    expected: "",
  },
  {
    input: "I need 200 meters of BX cable and 15 electrical boxes",
    expected: "",
  },
];

const LIVE_CASES: Array<{ utterance: string; expectEmpty?: boolean; expectIncludes?: string[] }> =
  [
    {
      utterance: "The PO is Kitchen Innovation, the owner is Sarah Del",
      expectIncludes: ["Kitchen Innovation", "Sarah Del"],
    },
    {
      utterance: "This is for the kitchen renovation at Sara Emma's place",
      expectIncludes: ["Kitchen renovation", "Sara Emma"],
    },
    {
      utterance: "Basement rewiring for David Klein",
      expectIncludes: ["Basement rewiring", "David Klein"],
    },
    {
      utterance:
        "I need 200 meters of BX cable and 15 electrical boxes",
      expectEmpty: true,
    },
  ];

function assertNormalize() {
  let failed = 0;
  for (const { input, expected } of NORMALIZE_CASES) {
    const got = normalizeProjectTitle(input);
    const viaMap = mapExtractionToLineItems([], [], "", input).projectTitle;
    if (got !== expected || viaMap !== expected) {
      failed += 1;
      console.error("FAIL normalize", { input, expected, got, viaMap });
    } else {
      console.log("OK   normalize", JSON.stringify(input), "→", JSON.stringify(got));
    }
  }
  return failed;
}

async function liveExtract(transcript: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0,
      messages: [
        { role: "system", content: QUOTE_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`GPT failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty GPT content");
  const parsed = JSON.parse(content) as {
    projectTitle?: string;
    project_name?: string;
  };
  return mapExtractionToLineItems(
    [],
    [],
    "",
    parsed.projectTitle ?? parsed.project_name ?? ""
  ).projectTitle;
}

async function assertLive(apiKey: string) {
  let failed = 0;
  console.log("\n— Live GPT extraction —");
  for (const test of LIVE_CASES) {
    const title = await liveExtract(test.utterance, apiKey);
    const framingLeak =
      /\b(the po is|the owner is|this is for|i need)\b/i.test(title) ||
      title.length > 60;

    let ok = true;
    if (test.expectEmpty) {
      ok = title === "";
    } else if (test.expectIncludes) {
      ok = test.expectIncludes.every((piece) =>
        title.toLowerCase().includes(piece.toLowerCase())
      );
    }
    if (framingLeak) ok = false;

    if (!ok) {
      failed += 1;
      console.error("FAIL live", {
        utterance: test.utterance,
        title,
        expectEmpty: test.expectEmpty,
        expectIncludes: test.expectIncludes,
      });
    } else {
      console.log(
        "OK   live",
        JSON.stringify(test.utterance),
        "→",
        JSON.stringify(title)
      );
    }
  }
  return failed;
}

async function main() {
  let failed = assertNormalize();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    failed += await assertLive(apiKey);
  } else {
    console.log(
      "\n(skip live GPT — set OPENAI_API_KEY to run the four utterance checks)"
    );
  }
  if (failed > 0) {
    console.error(`\n${failed} failure(s)`);
    process.exit(1);
  }
  console.log("\nAll project-title smoke checks passed.");
}

void main();
