const COMMIT_SHA = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() || "";
const COMMIT_MESSAGE =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE?.trim() || "";

function truncateCommitMessage(message: string, maxWords = 4): string {
  const words = message.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function getBuildVersionLabel(): string {
  if (!COMMIT_SHA) {
    return "local";
  }

  const shortHash = COMMIT_SHA.slice(0, 7);
  if (!COMMIT_MESSAGE) {
    return shortHash;
  }

  return `${shortHash} · ${truncateCommitMessage(COMMIT_MESSAGE)}`;
}
