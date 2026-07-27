export function getUserInitials(fullName: string, email: string): string {
  const trimmed = fullName.trim();

  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    return parts[0][0]?.toUpperCase() ?? "?";
  }

  const localPart = email.split("@")[0] ?? "";
  return localPart.slice(0, 1).toUpperCase() || "?";
}

export function getUserDisplayName(fullName: string, email: string): string {
  const trimmed = fullName.trim();
  return trimmed || email;
}
