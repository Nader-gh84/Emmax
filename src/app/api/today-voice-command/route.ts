import { NextResponse } from "next/server";
import {
  TODAY_VOICE_COMMAND_SYSTEM_PROMPT,
  normalizeVoiceCommandResult,
  type TodayVoiceAgendaCandidate,
  type TodayVoiceCommandResult,
  type TodayVoiceProjectCandidate,
} from "@/lib/today-voice-command";

type RequestBody = {
  transcript?: string;
  dateKey?: string;
  candidates?: TodayVoiceAgendaCandidate[];
  projects?: TodayVoiceProjectCandidate[];
};

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

    const body = (await request.json()) as RequestBody;
    const transcript = body.transcript?.trim() ?? "";
    const dateKey = body.dateKey?.trim() ?? "";
    const candidates = Array.isArray(body.candidates) ? body.candidates : [];
    const projects = Array.isArray(body.projects) ? body.projects : [];

    if (!transcript) {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return NextResponse.json(
        { error: "dateKey must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const projectPayload = projects.slice(0, 80).map((p) => ({
      id: p.id,
      projectName: p.projectName,
      customerId: p.customerId,
      customerName: p.customerName,
      status: p.status,
    }));

    const userPayload = {
      dateKey,
      transcript,
      candidates: candidates.slice(0, 40),
      projects: projectPayload,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: TODAY_VOICE_COMMAND_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify(userPayload),
          },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        { error: "Voice command classification failed", details },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "No classification result from model" },
        { status: 500 }
      );
    }

    let parsed: Partial<TodayVoiceCommandResult>;
    try {
      parsed = JSON.parse(content) as Partial<TodayVoiceCommandResult>;
    } catch {
      return NextResponse.json(
        { error: "Invalid classification JSON" },
        { status: 500 }
      );
    }

    const result = normalizeVoiceCommandResult(parsed);
    const allowedIds = new Set(candidates.map((c) => c.id));
    const allowedProjectIds = new Set(projectPayload.map((p) => p.id));

    if (result.targetAgendaId && !allowedIds.has(result.targetAgendaId)) {
      result.targetAgendaId = null;
      result.confidence = Math.min(result.confidence, 0.4);
      result.clarification =
        result.clarification ||
        "I couldn't match that to an item on today's agenda.";
      if (result.intent === "mark_done" || result.intent === "reschedule") {
        result.intent = "unknown";
      }
    }

    if (result.projectId && !allowedProjectIds.has(result.projectId)) {
      result.projectId = null;
      if (result.intent === "add_item" && result.projectQuery) {
        result.needsProjectClarification = true;
        result.confidence = Math.min(result.confidence, 0.5);
        result.clarification =
          result.clarification ||
          "Which project should I link this to?";
      }
    }

    // Spoken/typed a project name but no id — force clarify (never silent personal).
    if (
      result.intent === "add_item" &&
      result.projectQuery &&
      !result.projectId
    ) {
      result.needsProjectClarification = true;
    }

    if (result.intent === "add_item" && !result.date) {
      result.date = dateKey;
    }
    if (result.intent === "reschedule" && !result.date) {
      result.date = dateKey;
    }

    return NextResponse.json({
      transcript,
      command: result,
    });
  } catch (error) {
    console.error("today-voice-command error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to classify voice command",
      },
      { status: 500 }
    );
  }
}
