/** Case-, accent-, and punctuation-insensitive name normalization. */
export function normalizeEntityText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeEntityName(text: string): string[] {
  return normalizeEntityText(text).split(" ").filter(Boolean);
}
