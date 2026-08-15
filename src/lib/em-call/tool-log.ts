/**
 * Em Call tool execution logging.
 *
 * console.error alone is useless for debugging production voice failures from
 * this agent environment (no Vercel log access). Every tool failure is also
 * returned on the /api/em-call/turn response as `toolTrace` and mirrored to
 * the browser console by the Em Call overlay.
 */

export type EmCallToolTraceEntry = {
  tool: string;
  params: unknown;
  ok: boolean;
  error?: string;
  /** PostgREST / thrown error extras when available. */
  details?: unknown;
  stack?: string;
  durationMs: number;
  at: string;
};

export function formatSupabaseError(error: {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
} | null | undefined): string {
  if (!error) return "Unknown Supabase error";
  const parts = [
    error.message || "Supabase error",
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter(Boolean);
  return parts.join(" | ");
}

export function logEmCallToolEvent(
  entry: EmCallToolTraceEntry
): EmCallToolTraceEntry {
  const payload = {
    tool: entry.tool,
    params: entry.params,
    ok: entry.ok,
    error: entry.error,
    details: entry.details,
    stack: entry.stack,
    durationMs: entry.durationMs,
    at: entry.at,
  };

  if (entry.ok) {
    console.info("[Em Call tool] ok", payload);
  } else {
    console.error("[Em Call tool] FAILED", payload);
  }

  return entry;
}
