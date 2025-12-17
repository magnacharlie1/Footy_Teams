import { z } from "zod";

const lineSchema = z.string().trim();

const CHAT_EXPORT_SPLIT = /\d{1,2}[:.]\d{2}\s?-?\s?/; // "12:34 - Name"

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLine(line: string) {
  let value = lineSchema.parse(line);

  const chatMatch = value.match(/^\d{1,2}[:.]\d{2}\s*[-–]\s*(.+)$/);
  if (chatMatch?.[1]) {
    value = chatMatch[1];
  }

  value = value.replace(/^[•*·\-–—•\u2022]+\s*/, ""); // bullets/dashes
  value = value.replace(/^\d+[\].)\-:\s]*/, ""); // numbering "1) Name"
  value = value.replace(/:\s?.*$/, ""); // strip trailing message content

  value = value.replace(/^[\s\-\u2013\u2014]+/, "").replace(/[:\-\s]+$/, "");
  return value.trim();
}

export type ParsedName = {
  original: string;
  cleaned: string;
  normalized: string;
};

export function parseWhatsAppNames(input: string): ParsedName[] {
  const lines = input.split(/\r?\n/);
  const seen = new Set<string>();

  const parsed: ParsedName[] = [];

  for (const raw of lines) {
    const cleaned = cleanLine(raw);
    if (!cleaned) continue;
    if (cleaned.length < 2) continue;

    const normalized = normalizeName(cleaned);
    if (!normalized || normalized.length < 2) continue;

    if (seen.has(normalized)) continue;
    seen.add(normalized);

    parsed.push({ original: raw.trim(), cleaned, normalized });
  }

  return parsed;
}
