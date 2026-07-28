import type { PostgrestError } from "@supabase/supabase-js";

export function formatSupabaseError(
  error: PostgrestError,
  context: string
): string {
  const parts = [
    context,
    error.message,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

export function logSupabaseError(
  context: string,
  error: PostgrestError,
  extra?: Record<string, unknown>
): void {
  console.error(`[Supabase] ${context}`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    ...extra,
  });
}

export function throwSupabaseError(
  context: string,
  error: PostgrestError,
  userMessage: string,
  extra?: Record<string, unknown>
): never {
  logSupabaseError(context, error, extra);
  throw new Error(formatSupabaseError(error, userMessage));
}
