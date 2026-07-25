import { NextResponse } from "next/server";

interface ExtractedMaterial {
  item: string;
  brand: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface GptExtraction {
  materials: ExtractedMaterial[];
  scopeOfWork: string;
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
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You extract structured quote data from tradespeople voice transcripts for Canadian contractors.
Return valid JSON with this exact shape:
{
  "materials": [{ "item": string, "brand": string, "quantity": number, "unit": string, "unitPrice": number }],
  "scopeOfWork": string
}
Rules:
- item: clear material or labour description
- brand: manufacturer or brand name if mentioned (e.g. "Leviton", "Legrand"); use "Generic" if not mentioned
- quantity: numeric quantity mentioned or reasonable default of 1
- unit: each, ft, sq ft, hour, roll, box, etc.
- unitPrice: estimated CAD price per unit
- scopeOfWork: concise professional summary of the job scope

Common brand names to watch for (even if transcript spelling looks slightly off):
Electrical: Leviton, Legrand, Square D, Eaton, Siemens, GE, Southwire, Carlon, Milwaukee, DeWalt, Klein Tools
Plumbing: Kohler, Moen, Delta, American Standard, IPEX, Uponor, Rheem, Bradford White
HVAC: Carrier, Lennox, Trane, Goodman, Honeywell, Rheem

The transcript may contain speech-to-text errors, especially for brand names that sound similar to common words (e.g. "Kohler" may be transcribed as "cold air" or "coaler"; "Leviton" may become "lever on" or similar). When a material name in the transcript sounds phonetically similar to a known brand from the list above, and the context (item type) matches that brand's product category (e.g. faucets, outlets, wire), correct the brand field to the most likely intended brand rather than defaulting to "Generic". Only use "Generic" when no brand is mentioned or implied at all.`,
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
        { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;
    const manualText = formData.get("text") as string | null;

    let transcript = manualText?.trim() ?? "";

    if (!transcript && audio && audio.size > 0) {
      const whisperForm = new FormData();
      whisperForm.append("file", audio, audio.name || "recording.webm");
      whisperForm.append("model", "whisper-1");

      const whisperResponse = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: whisperForm,
        }
      );

      if (!whisperResponse.ok) {
        const error = await whisperResponse.text();
        return NextResponse.json(
          { error: "Transcription failed", details: error },
          { status: 500 }
        );
      }

      const whisperData = await whisperResponse.json();
      transcript = whisperData.text ?? "";
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "No audio or text provided" },
        { status: 400 }
      );
    }

    const extracted = await extractQuoteData(transcript, apiKey);

    return NextResponse.json({
      transcript,
      materials: extracted.materials ?? [],
      scopeOfWork: extracted.scopeOfWork ?? "",
    });
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process audio",
      },
      { status: 500 }
    );
  }
}
