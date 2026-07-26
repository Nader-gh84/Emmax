import { NextResponse } from "next/server";
import type { ProfileFieldKey } from "@/types/onboarding";

const FIELD_INSTRUCTIONS: Record<ProfileFieldKey, string> = {
  fullName:
    "Extract only the person's full name (first and last). Ignore filler words like 'my name is'.",
  companyName:
    "Extract the company or business name. If they said none, no company, or similar, return an empty string.",
  trade:
    "Extract the trade or profession (e.g. electrician, plumber, HVAC, carpenter). Return a clean label.",
  city: "Extract only the city name.",
  email:
    "Extract a valid email address. Return only the email, normalized to lowercase.",
  phone:
    "Extract a phone number if provided. If they said no, skip, or don't want to add one, return an empty string.",
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as {
      field?: ProfileFieldKey;
      transcript?: string;
    };

    const field = body.field;
    const transcript = body.transcript?.trim();

    if (!field || !transcript) {
      return NextResponse.json(
        { error: "field and transcript are required" },
        { status: 400 }
      );
    }

    if (!(field in FIELD_INSTRUCTIONS)) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You extract a single onboarding field value from a spoken transcript for Canadian tradespeople.
Return valid JSON: { "value": string }
Field: ${field}
Rule: ${FIELD_INSTRUCTIONS[field]}
Return only the cleaned value with no extra commentary.`,
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
      return NextResponse.json(
        { error: "Field extraction failed", details: error },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No extraction result" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content) as { value?: string };

    return NextResponse.json({
      value: parsed.value?.trim() ?? "",
    });
  } catch (error) {
    console.error("Extract field error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract field",
      },
      { status: 500 }
    );
  }
}
