import { NextResponse } from "next/server";
import {
  ExtractedLabourPayload,
  ExtractedMaterialPayload,
  QUOTE_EXTRACTION_SYSTEM_PROMPT,
  mapExtractionToLineItems,
} from "@/lib/quote-extraction";

interface GptExtraction {
  materials?: ExtractedMaterialPayload[];
  labourItems?: ExtractedLabourPayload[];
  scopeOfWork?: string;
  projectTitle?: string;
  project_name?: string;
}

async function extractQuoteData(
  transcript: string,
  apiKey: string
): Promise<GptExtraction> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: QUOTE_EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GPT extraction failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No extraction result from GPT");
  }

  return JSON.parse(content) as GptExtraction;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as { transcript?: string };
    const transcript = body.transcript?.trim() ?? "";

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      );
    }

    const extracted = await extractQuoteData(transcript, apiKey);
    const mapped = mapExtractionToLineItems(
      extracted.materials ?? [],
      extracted.labourItems ?? [],
      extracted.scopeOfWork ?? "",
      extracted.projectTitle ?? extracted.project_name ?? ""
    );

    return NextResponse.json({
      materials: mapped.materials.map(
        ({ item, brand, quantity, unit, unitCost, unitPrice }) => ({
          item,
          brand,
          quantity,
          unit,
          unitCost,
          unitPrice,
        })
      ),
      labourItems: mapped.labourItems.map(({ description, hours, rate }) => ({
        description,
        hours,
        rate,
      })),
      scopeOfWork: mapped.scopeOfWork,
      projectTitle: mapped.projectTitle,
    });
  } catch (error) {
    console.error("Extract quote error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Couldn't parse that, try again or add items manually",
      },
      { status: 500 }
    );
  }
}
