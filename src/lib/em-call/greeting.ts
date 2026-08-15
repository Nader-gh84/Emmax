export type EmCallPhase =
  | "idle"
  | "greeting"
  | "listening"
  | "ready"
  | "thinking"
  | "speaking"
  | "closing";

export function getEmCallFirstName(
  fullName: string | null | undefined,
  email: string | null | undefined
): string {
  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0]!;
  }
  if (email) {
    const local = email.split("@")[0] ?? "";
    const segment = local.split(/[._-]/)[0] ?? "";
    if (segment) {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
  }
  return "there";
}

export function buildEmCallGreeting(firstName: string): string {
  const name = firstName.trim() || "there";
  return `Hey ${name}, how can I help you?`;
}

export const EM_CALL_TTS_VOICE = "nova";

export const EM_CALL_TTS_INSTRUCTIONS =
  "Warm, clear, concise. Friendly teammate energy — not robotic, not overly cheerful.";
