import type { MaterialItem } from "@/types/quote";

export interface ExtractedSupplierPrice {
  description: string;
  brand?: string;
  unitPrice: number;
  unit?: string;
  quantity?: number;
  notes?: string;
}

export type MatchConfidence = "high" | "medium" | "low" | "unmatched";

export interface SupplierPriceMatchRow {
  materialId: string;
  materialItem: string;
  materialBrand: string;
  materialUnit: string;
  currentUnitPrice: number;
  extractedDescription: string | null;
  extractedBrand: string | null;
  suggestedUnitPrice: number | null;
  confidence: MatchConfidence;
  score: number;
  selected: boolean;
}

export interface UnmatchedExtractedPrice {
  description: string;
  brand?: string;
  unitPrice: number;
  notes?: string;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "of",
  "for",
  "to",
  "in",
  "on",
  "with",
  "x",
  "ea",
  "each",
  "pc",
  "pcs",
  "ft",
  "feet",
  "box",
  "roll",
]);

export function normalizePricingText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizePricingText(value: string): string[] {
  return normalizePricingText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/** Dice coefficient on token sets — 0..1 */
export function tokenSimilarity(a: string, b: string): number {
  const aTokens = new Set(tokenizePricingText(a));
  const bTokens = new Set(tokenizePricingText(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of Array.from(aTokens)) {
    if (bTokens.has(token)) overlap += 1;
  }

  return (2 * overlap) / (aTokens.size + bTokens.size);
}

function materialSearchText(material: MaterialItem): string {
  return `${material.item} ${material.brand}`.trim();
}

function extractedSearchText(extracted: ExtractedSupplierPrice): string {
  return `${extracted.description} ${extracted.brand ?? ""}`.trim();
}

function confidenceFromScore(score: number): MatchConfidence {
  if (score >= 0.72) return "high";
  if (score >= 0.5) return "medium";
  if (score >= 0.38) return "low";
  return "unmatched";
}

/**
 * Best-effort match of extracted supplier prices onto existing materials.
 * Low-confidence guesses are left unmatched rather than forced.
 */
export function matchExtractedPricesToMaterials(
  materials: MaterialItem[],
  extracted: ExtractedSupplierPrice[]
): {
  rows: SupplierPriceMatchRow[];
  unmatchedExtracted: UnmatchedExtractedPrice[];
} {
  const remaining = extracted.map((item, index) => ({ item, index }));
  const usedExtracted = new Set<number>();

  const rows: SupplierPriceMatchRow[] = materials.map((material) => {
    const materialText = materialSearchText(material);
    let best:
      | { extracted: ExtractedSupplierPrice; index: number; score: number }
      | null = null;

    for (const candidate of remaining) {
      if (usedExtracted.has(candidate.index)) continue;
      const score = tokenSimilarity(
        materialText,
        extractedSearchText(candidate.item)
      );
      if (!best || score > best.score) {
        best = { extracted: candidate.item, index: candidate.index, score };
      }
    }

    const confidence = best ? confidenceFromScore(best.score) : "unmatched";
    const isMatch =
      best != null &&
      Number.isFinite(best.extracted.unitPrice) &&
      best.extracted.unitPrice > 0 &&
      (confidence === "high" || confidence === "medium");

    if (isMatch && best) {
      usedExtracted.add(best.index);
      return {
        materialId: material.id,
        materialItem: material.item,
        materialBrand: material.brand,
        materialUnit: material.unit,
        currentUnitPrice: material.unitPrice,
        extractedDescription: best.extracted.description,
        extractedBrand: best.extracted.brand ?? null,
        suggestedUnitPrice: best.extracted.unitPrice,
        confidence,
        score: best.score,
        selected: true,
      };
    }

    return {
      materialId: material.id,
      materialItem: material.item,
      materialBrand: material.brand,
      materialUnit: material.unit,
      currentUnitPrice: material.unitPrice,
      extractedDescription: best?.extracted.description ?? null,
      extractedBrand: best?.extracted.brand ?? null,
      suggestedUnitPrice:
        confidence === "low" && best ? best.extracted.unitPrice : null,
      confidence: best && confidence === "low" ? "low" : "unmatched",
      score: best?.score ?? 0,
      selected: false,
    };
  });

  const unmatchedExtracted: UnmatchedExtractedPrice[] = remaining
    .filter((candidate) => !usedExtracted.has(candidate.index))
    .map(({ item }) => ({
      description: item.description,
      brand: item.brand,
      unitPrice: item.unitPrice,
      notes: item.notes,
    }));

  return { rows, unmatchedExtracted };
}

export const SUPPLIER_PRICING_EXTRACTION_PROMPT = `You extract material unit prices from a supplier pricing reply (quote, invoice, email, screenshot, or PDF).
Return valid JSON only with this shape:
{
  "items": [
    {
      "description": string,
      "brand": string | null,
      "unitPrice": number,
      "unit": string | null,
      "quantity": number | null,
      "notes": string | null
    }
  ]
}
Rules:
- unitPrice must be the supplier's price PER UNIT in CAD (or the currency shown), as a number (no $ sign)
- Prefer line-item unit prices over line totals. If only a line total and quantity are shown, compute unitPrice = total / quantity
- Ignore labour, taxes, shipping, and grand totals unless they are clearly material line prices
- description should be the product/material name as written by the supplier
- brand if clearly present, otherwise null
- If you cannot find any material prices, return {"items":[]}
- Do not invent prices`;
