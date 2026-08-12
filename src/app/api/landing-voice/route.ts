import { NextResponse } from "next/server";
import {
  EMA_LANDING_FACTS,
  EMA_LANDING_VOICE_SYSTEM_PROMPT,
  isLandingVoiceTopic,
} from "@/lib/ema-landing-facts";

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

    const body = (await request.json()) as { topic?: unknown };
    if (!isLandingVoiceTopic(body.topic)) {
      return NextResponse.json(
        { error: "topic must be projects, suppliers, or customers" },
        { status: 400 }
      );
    }

    const facts = EMA_LANDING_FACTS[body.topic];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.9,
        max_tokens: 220,
        messages: [
          { role: "system", content: EMA_LANDING_VOICE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Topic: ${body.topic}\n\nApproved facts (use only these):\n${facts}\n\nWrite one short spoken variation now.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: "Voice script generation failed", details },
        { status: 500 }
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "Empty voice script from model" },
        { status: 500 }
      );
    }

    return NextResponse.json({ topic: body.topic, text });
  } catch (error) {
    console.error("Landing voice error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate landing voice script",
      },
      { status: 500 }
    );
  }
}
