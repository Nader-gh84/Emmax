export type EmCallChatRole = "system" | "user" | "assistant";

export type EmCallChatMessage = {
  role: EmCallChatRole;
  content: string;
};

export type EmCallSession = {
  id: string;
  userId: string;
  greetingName: string;
  messages: EmCallChatMessage[];
  createdAt: number;
  updatedAt: number;
};

const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_MESSAGES = 40;

const sessions = new Map<string, EmCallSession>();

function pruneExpired(now = Date.now()) {
  for (const id of Array.from(sessions.keys())) {
    const session = sessions.get(id);
    if (!session) continue;
    if (now - session.updatedAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

export function createEmCallSession(input: {
  userId: string;
  greetingName: string;
  systemPrompt: string;
}): EmCallSession {
  pruneExpired();
  const now = Date.now();
  const session: EmCallSession = {
    id: crypto.randomUUID(),
    userId: input.userId,
    greetingName: input.greetingName,
    messages: [{ role: "system", content: input.systemPrompt }],
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(session.id, session);
  return session;
}

export function getEmCallSession(
  sessionId: string,
  userId: string
): EmCallSession | null {
  pruneExpired();
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) return null;
  return session;
}

export function appendEmCallMessage(
  session: EmCallSession,
  message: EmCallChatMessage
): void {
  session.messages.push(message);
  if (session.messages.length > MAX_MESSAGES) {
    const system = session.messages.find((m) => m.role === "system");
    const nonSystem = session.messages.filter((m) => m.role !== "system");
    const budget = MAX_MESSAGES - (system ? 1 : 0);
    const kept = nonSystem.slice(-budget);
    session.messages = system ? [system, ...kept] : kept;
  }
  session.updatedAt = Date.now();
}

export function deleteEmCallSession(sessionId: string, userId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.userId !== userId) return false;
  sessions.delete(sessionId);
  return true;
}

export function openAiMessagesFromSession(session: EmCallSession) {
  return session.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
