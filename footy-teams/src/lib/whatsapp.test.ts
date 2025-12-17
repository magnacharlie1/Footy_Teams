import { describe, expect, it } from "vitest";

import { parseWhatsAppNames } from "./whatsapp";

describe("parseWhatsAppNames", () => {
  it("parses simple lines and normalizes duplicates", () => {
    const result = parseWhatsAppNames("Alice\nBob\nalice\n");
    expect(result.map((r) => r.cleaned)).toEqual(["Alice", "Bob"]);
  });

  it("ignores numbering and bullets", () => {
    const result = parseWhatsAppNames("1) Alice\n- Bob\n• Charlie");
    expect(result.map((r) => r.cleaned)).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("handles WhatsApp export timestamps", () => {
    const text = "12:34 - Alice: joined\n18:00 - Bob";
    const result = parseWhatsAppNames(text);
    expect(result.map((r) => r.cleaned)).toEqual(["Alice", "Bob"]);
  });

  it("skips tiny/blank/non-names", () => {
    const result = parseWhatsAppNames("\n.\nA\n  \nJack");
    expect(result.map((r) => r.cleaned)).toEqual(["Jack"]);
  });
});
