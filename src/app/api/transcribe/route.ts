import { NextResponse } from "next/server";
import {
  ExtractedLabourPayload,
  ExtractedMaterialPayload,
  QUOTE_EXTRACTION_SYSTEM_PROMPT,
  mapExtractionToLineItems,
} from "@/lib/quote-extraction";
import {
  guardWhisperTranscript,
  type WhisperVerboseResult,
} from "@/lib/whisper-guard";

interface GptExtraction {
  materials?: ExtractedMaterialPayload[];
  labourItems?: ExtractedLabourPayload[];
  scopeOfWork?: string;
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

async function transcribeAudio(
  audio: File,
  apiKey: string
): Promise<WhisperVerboseResult> {
  const whisperForm = new FormData();
  whisperForm.append("file", audio, audio.name || "recording.webm");
  whisperForm.append("model", "whisper-1");
  whisperForm.append("language", "en");
  whisperForm.append("response_format", "verbose_json");

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
    throw new Error(`Transcription failed: ${error}`);
  }

  return (await whisperResponse.json()) as WhisperVerboseResult;
}

function noSpeechResponse() {
  return NextResponse.json({
    transcript: "",
    noSpeech: true,
  });
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

    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;
    const manualText = formData.get("text") as string | null;
    const extractFlag = formData.get("extract");
    const shouldExtract =
      extractFlag === null || extractFlag === "true" || extractFlag === "1";

    let transcript = manualText?.trim() ?? "";
    let fromAudio = false;

    if (!transcript && audio && audio.size > 0) {
      fromAudio = true;
      try {
        const whisperResult = await transcribeAudio(audio, apiKey);
        const guarded = guardWhisperTranscript(whisperResult);
        if (!guarded.ok) {
          return noSpeechResponse();
        }
        transcript = guarded.transcript;
      } catch (error) {
        return NextResponse.json(
          {
            error: "Transcription failed",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 500 }
        );
      }
    }

    if (!transcript) {
      // Empty manual text, or empty audio with no usable speech
      if (fromAudio || (audio && audio.size > 0)) {
        return noSpeechResponse();
      }
      return NextResponse.json(
        { error: "No audio or text provided" },
        { status: 400 }
      );
    }

    // Manual text path: still reject obvious CJK / artifact paste-through
    if (!fromAudio) {
      const guarded = guardWhisperTranscript({ text: transcript });
      if (!guarded.ok) {
        return noSpeechResponse();
      }
      transcript = guarded.transcript;
    }

    if (!shouldExtract) {
      return NextResponse.json({ transcript, noSpeech: false });
    }

    const extracted = await extractQuoteData(transcript, apiKey);
    const mapped = mapExtractionToLineItems(
      extracted.materials ?? [],
      extracted.labourItems ?? [],
      extracted.scopeOfWork ?? ""
    );

    return NextResponse.json({
      transcript,
      noSpeech: false,
      materials: mapped.materials.map(
        ({ item, brand, quantity, unit, unitPrice }) => ({
          item,
          brand,
          quantity,
          unit,
          unitPrice,
        })
      ),
      labourItems: mapped.labourItems.map(({ description, hours, rate }) => ({
        description,
        hours,
        rate,
      })),
      scopeOfWork: mapped.scopeOfWork,
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
