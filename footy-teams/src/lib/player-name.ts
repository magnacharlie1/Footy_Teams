export function normalizePlayerName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
