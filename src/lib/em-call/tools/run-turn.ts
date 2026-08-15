import {
  EM_CALL_READ_TOOLS,
  isEmCallReadToolName,
} from "@/lib/em-call/tools/definitions";
import { executeEmCallReadTool } from "@/lib/em-call/tools/execute-reads";
import {
  logEmCallToolEvent,
  type EmCallToolTraceEntry,
} from "@/lib/em-call/tool-log";
import type { EmCallSession } from "@/lib/em-call/session-store";
import { openAiMessagesFromSession } from "@/lib/em-call/session-store";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_TOOL_ROUNDS = 4;

type OpenAiMessage = {
  role: string;
  content?: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
};

type OpenAiToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
      tool_calls?: OpenAiToolCall[];
    };
    finish_reason?: string;
  }>;
};

export type EmCallTurnResult = {
  reply: string;
  usedTools: boolean;
  toolNames: string[];
  /** Full per-tool trace including failures — returned to the client. */
  toolTrace: EmCallToolTraceEntry[];
};

function extractToolError(result: unknown): {
  error?: string;
  details?: unknown;
} {
  if (!result || typeof result !== "object") return {};
  const row = result as Record<string, unknown>;
  const error = typeof row.error === "string" ? row.error : undefined;
  const details =
    row.debug ??
    row.supabase ??
    row.details ??
    (error ? { raw: result } : undefined);
  return { error, details };
}

export async function runEmCallTurnWithTools(input: {
  apiKey: string;
  session: EmCallSession;
  supabase: SupabaseClient;
  userId: string;
}): Promise<EmCallTurnResult> {
  const working: OpenAiMessage[] = openAiMessagesFromSession(input.session).map(
    (m) => ({ role: m.role, content: m.content })
  );

  const toolNamesUsed: string[] = [];
  const toolTrace: EmCallToolTraceEntry[] = [];
  let usedTools = false;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 320,
        tools: EM_CALL_READ_TOOLS,
        tool_choice: "auto",
        messages: working,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Em Call model error: ${details}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error("Empty model response");
    }

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      const reply = message.content?.trim();
      if (!reply) {
        throw new Error("Empty reply from model");
      }
      return {
        reply,
        usedTools,
        toolNames: toolNamesUsed,
        toolTrace,
      };
    }

    usedTools = true;
    working.push({
      role: "assistant",
      content: message.content ?? null,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const name = call.function?.name ?? "";
      const rawArgs = call.function?.arguments ?? "{}";
      toolNamesUsed.push(name);
      const started = Date.now();

      let parsedParams: unknown = rawArgs;
      try {
        parsedParams = rawArgs ? JSON.parse(rawArgs) : {};
      } catch {
        parsedParams = { _raw: rawArgs, _parseError: true };
      }

      let result: unknown;
      let trace: EmCallToolTraceEntry;

      if (!isEmCallReadToolName(name)) {
        result = {
          error: `Tool "${name}" is not available yet in this Em Call build.`,
        };
        trace = logEmCallToolEvent({
          tool: name,
          params: parsedParams,
          ok: false,
          error: (result as { error: string }).error,
          durationMs: Date.now() - started,
          at: new Date().toISOString(),
        });
      } else {
        try {
          result = await executeEmCallReadTool(
            { supabase: input.supabase, userId: input.userId },
            name,
            rawArgs
          );
          const extracted = extractToolError(result);
          const ok = !extracted.error;
          trace = logEmCallToolEvent({
            tool: name,
            params: parsedParams,
            ok,
            error: extracted.error,
            details: extracted.details,
            durationMs: Date.now() - started,
            at: new Date().toISOString(),
          });
        } catch (err) {
          const messageText =
            err instanceof Error ? err.message : "Tool execution failed";
          const stack = err instanceof Error ? err.stack : undefined;
          result = {
            error: messageText,
            debug: { stack },
          };
          trace = logEmCallToolEvent({
            tool: name,
            params: parsedParams,
            ok: false,
            error: messageText,
            details: { stack },
            stack,
            durationMs: Date.now() - started,
            at: new Date().toISOString(),
          });
        }
      }

      toolTrace.push(trace);

      working.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Exhausted tool rounds — ask model for a final spoken answer without more tools
  const finalResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 320,
        messages: [
          ...working,
          {
            role: "system",
            content:
              "Stop calling tools. Give a short spoken answer from the tool results you already have.",
          },
        ],
      }),
    }
  );

  if (!finalResponse.ok) {
    const details = await finalResponse.text();
    throw new Error(`Em Call final reply failed: ${details}`);
  }

  const finalData = (await finalResponse.json()) as ChatCompletionResponse;
  const reply = finalData.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("Empty final reply from model");
  }

  return { reply, usedTools, toolNames: toolNamesUsed, toolTrace };
}
