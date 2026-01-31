export function normalizePlayerName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function safeDisplayName(name?: string | null) {
  const trimmed = name?.trim() || "";
  if (!trimmed) return "Member";
  return trimmed.includes("@") ? "Member" : trimmed;
}

export function needsProfileName(name?: string | null) {
  const trimmed = name?.trim() || "";
  if (!trimmed) return true;
  if (trimmed.includes("@")) return true;
  return trimmed.toLowerCase() === "member";
}
