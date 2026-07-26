import { NextResponse } from "next/server";
import type { ProfileData, ProfileFieldKey } from "@/types/onboarding";

const FIELD_ALIASES: Record<ProfileFieldKey, string[]> = {
  fullName: ["name", "full name", "fullname"],
  companyName: ["company", "company name", "business"],
  trade: ["trade", "profession", "job"],
  city: ["city", "location", "town"],
  email: ["email", "email address"],
  phone: ["phone", "phone number", "mobile", "cell"],
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
      transcript?: string;
      profile?: ProfileData;
    };

    const transcript = body.transcript?.trim();

    if (!transcript) {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
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
            content: `Classify the user's intent during onboarding profile review.
Return valid JSON: { "intent": "confirm" | "change" | "enable_microphone", "field": string | null }
Rules:
- intent "confirm" when they agree (yes, confirm, looks good, that's correct, etc.)
- intent "change" when they want to update a specific field (e.g. "change email", "update my name")
- intent "enable_microphone" when they ask to enable, turn on, or switch back to voice/microphone
- field must be one of: fullName, companyName, trade, city, email, phone — or null if unclear
Field aliases: ${JSON.stringify(FIELD_ALIASES)}`,
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
        { error: "Intent classification failed", details: error },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No classification result" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content) as {
      intent?: string;
      field?: ProfileFieldKey | null;
    };

    const intent = parsed.intent ?? "change";
    const validFields: ProfileFieldKey[] = [
      "fullName",
      "companyName",
      "trade",
      "city",
      "email",
      "phone",
    ];
    const field =
      parsed.field && validFields.includes(parsed.field) ? parsed.field : null;

    return NextResponse.json({ intent, field });
  } catch (error) {
    console.error("Summary intent error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to classify intent",
      },
      { status: 500 }
    );
  }
}
