import {
  LabourItem,
  MaterialItem,
  createLabourItem,
  createMaterialItem,
} from "@/types/quote";

export interface ExtractedMaterialPayload {
  item?: string;
  brand?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
}

export interface ExtractedLabourPayload {
  description?: string;
  hours?: number;
  rate?: number;
}

export interface QuoteExtractionResult {
  materials: MaterialItem[];
  labourItems: LabourItem[];
  scopeOfWork: string;
  projectTitle: string;
}

const LABOUR_UNIT_PATTERN = /^(hour|hours|hr|hrs)$/i;
const LABOUR_ITEM_PATTERN =
  /\b(labour|labor|install(?:ation)?|rough[- ]?in|service)\b/i;

function sanitizeNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isLabourMaterial(material: ExtractedMaterialPayload): boolean {
  const unit = (material.unit ?? "").trim();
  if (LABOUR_UNIT_PATTERN.test(unit)) return true;
  return LABOUR_ITEM_PATTERN.test(material.item ?? "");
}

export function mapExtractionToLineItems(
  materialsPayload: ExtractedMaterialPayload[] = [],
  labourPayload: ExtractedLabourPayload[] = [],
  scopeOfWork = "",
  projectTitle = ""
): QuoteExtractionResult {
  const materials: MaterialItem[] = [];
  const labourItems: LabourItem[] = [];

  for (const material of materialsPayload) {
    if (isLabourMaterial(material)) {
      labourItems.push(
        createLabourItem({
          description: material.item?.trim() || "Labour",
          hours: sanitizeNumber(material.quantity, 1),
          rate: sanitizeNumber(material.unitPrice, 0),
        })
      );
      continue;
    }

    materials.push(
      createMaterialItem({
        item: material.item ?? "",
        brand: material.brand ?? "",
        quantity: sanitizeNumber(material.quantity, 1),
        unit: material.unit ?? "each",
        // AI guesses are neither real supplier cost nor agreed sell price.
        unitCost: 0,
        unitPrice: 0,
      })
    );
  }

  for (const labour of labourPayload) {
    labourItems.push(
      createLabourItem({
        description: labour.description?.trim() || "Labour",
        hours: sanitizeNumber(labour.hours, 1),
        rate: sanitizeNumber(labour.rate, 0),
      })
    );
  }

  return {
    materials,
    labourItems,
    scopeOfWork: scopeOfWork.trim(),
    projectTitle: normalizeProjectTitle(projectTitle),
  };
}

/**
 * Light post-pass: strip leftover framing phrases if the model still includes them.
 * Does not invent titles — only cleans an already-extracted string.
 */
export function normalizeProjectTitle(raw: string): string {
  let title = raw.trim();
  if (!title) return "";

  // Drop wrapping quotes the model sometimes adds
  title = title.replace(/^["'“”]+|["'“”]+$/g, "").trim();

  const framingPatterns: RegExp[] = [
    /^(?:the\s+)?(?:po|p\.?o\.?|purchase\s+order)\s+(?:number\s+|no\.?\s+|is\s+|for\s+)/i,
    /^(?:the\s+)?(?:project|job|work)\s+(?:name\s+|title\s+)?(?:is\s+|for\s+|called\s+)/i,
    /^(?:this\s+is\s+for(?:\s+the)?|it'?s\s+called|we'?re\s+doing|doing\s+a)\s+/i,
    /^(?:job\s+name\s+is|name\s+is|called)\s+/i,
  ];

  for (const pattern of framingPatterns) {
    title = title.replace(pattern, "").trim();
  }

  // "…, the owner/customer is X" → "… — X"
  title = title.replace(
    /[,.]?\s*(?:the\s+)?(?:owner|customer|client|homeowner)\s+(?:is|named)\s+/i,
    " — "
  );
  // "… for [Name]" when name looks like a person (capitalized words) and not "for the kitchen"
  title = title.replace(
    /\s+for\s+(?!the\s)([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+)?)\s*$/,
    " — $1"
  );
  // "… at [Name]'s place/house/home"
  title = title.replace(
    /\s+at\s+([A-Za-z][A-Za-z-]*(?:\s+[A-Za-z][A-Za-z-]*)?)(?:['’]s)?(?:\s+(?:place|house|home|residence))?\s*$/i,
    " — $1"
  );

  title = title
    .replace(/\s*[–—−]+\s*/g, " — ")
    .replace(/\s+job$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[—,\s]+|[—,\s]+$/g, "")
    .trim();

  // Capitalize first letter of each segment (job / who) for display polish
  title = title
    .split(" — ")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    })
    .filter(Boolean)
    .join(" — ");

  // Title-case soft cleanup: leave as-is if already mixed; just ensure separator spacing
  if (title.length > 60) {
    // Prefer left side of em dash if overlong
    const parts = title.split(" — ");
    if (parts.length >= 2) {
      const job = parts[0]!.trim();
      const who = parts.slice(1).join(" — ").trim();
      const shortened = `${job} — ${who}`.slice(0, 60).replace(/\s+\S*$/, "").trim();
      title = shortened.replace(/[—,\s-]+$/, "").trim();
    } else {
      title = title.slice(0, 60).replace(/\s+\S*$/, "").trim();
    }
  }

  if (looksLikeMaterialsDump(title)) {
    return "";
  }

  return title;
}

/** Reject titles that are clearly a materials order, not a job name. */
function looksLikeMaterialsDump(title: string): boolean {
  if (!title) return false;
  if (
    /^(?:i\s+need|i\s+want|we\s+need|i'?ll\s+need|add|order|get\s+me|give\s+me)\b/i.test(
      title
    )
  ) {
    return true;
  }
  const qtyHits = title.match(
    /\b\d+(?:\.\d+)?\s*(?:meters?|m\b|ft|feet|boxes|pcs|pieces|rolls?|each|bags?|packs?)\b/gi
  );
  if ((qtyHits?.length ?? 0) >= 2 && !title.includes(" — ")) {
    return true;
  }
  return false;
}

export const QUOTE_EXTRACTION_SYSTEM_PROMPT = `You extract structured quote data from tradespeople voice transcripts for Canadian contractors.
Return valid JSON with this exact shape:
{
  "materials": [{ "item": string, "brand": string, "quantity": number, "unit": string, "unitPrice": number }],
  "labourItems": [{ "description": string, "hours": number, "rate": number }],
  "scopeOfWork": string,
  "projectTitle": string
}
Rules:
- materials.item: clear material/product description (NOT labour)
- materials.brand: manufacturer or brand name if mentioned (e.g. "Leviton", "Legrand"); use "Generic" if not mentioned
- materials.quantity: numeric quantity mentioned or reasonable default of 1
- materials.unit: each, ft, sq ft, roll, box, etc. Never use hour/hours for materials
- materials.unitPrice: ignored by the app for materials (always stored as 0 until
  supplier pricing is applied). Still accepted in JSON for labour lines misclassified
  as materials. Do not invent prices.
- labourItems: put ALL labour/installation/rough-in/service time here (not in materials)
- labourItems.description: clear labour description (e.g. "Labour – Installation")
- labourItems.hours: numeric hours mentioned or reasonable default of 1
- labourItems.rate: estimated CAD hourly rate
- scopeOfWork: concise professional summary of the job scope

projectTitle — PARSE, DO NOT COPY:
- Compose a short clean title for the JOB. Optionally include CUSTOMER or LOCATION.
- Format: "Job type" or "Job type — Customer/Location" using an em dash (—) between parts.
- STRIP framing language. These are instructions about the title, NEVER part of it:
  "the PO is", "the P.O. is", "purchase order is", "the project is", "the job is",
  "this is for", "this is for the", "it's called", "job name is", "name is",
  "the owner is", "the customer is", "the client is", "the homeowner is",
  "we're doing", "doing a", "at …'s place/house/home".
- NEVER dump the raw utterance into projectTitle.
- NEVER include material items, products, brands, quantities, or line items in the title
  (e.g. never "BX cable", "pot lights", "Leviton dimmer", "200 meters").
- Keep it short (~60 characters max). If you are grabbing a whole sentence, you are wrong — tighten.
- If the speaker only lists materials / labour with no job, customer, or location → return "".
- Low confidence → "" (do not guess).

Worked examples (utterance → projectTitle):
1. "The PO is Kitchen Innovation, the owner is Sarah Del"
   → "Kitchen Innovation — Sarah Del"
2. "This is for the kitchen renovation at Sara Emma's place"
   → "Kitchen renovation — Sara Emma"
3. "Basement rewiring, 135 13th Avenue"
   → "Basement rewiring — 135 13th Ave"
4. "Basement rewiring for David Klein"
   → "Basement rewiring — David Klein"
5. "Smith bathroom job"
   → "Smith bathroom"
6. "I need 200 meters of BX cable and 15 electrical boxes"
   → ""   (materials only — no title)
7. "Kitchen reno for the Johnsons, need 8 pot lights and a dimmer"
   → "Kitchen reno — Johnsons"   (materials go in materials[], not the title)
8. "PO number is upstairs suite upgrade"
   → "Upstairs suite upgrade"

Common brand names to watch for (even if transcript spelling looks slightly off):
Electrical: Leviton, Legrand, Square D, Eaton, Siemens, GE, Southwire, Carlon, Milwaukee, DeWalt, Klein Tools, Nexans, Liteline
Plumbing: Kohler, Moen, Delta, American Standard, IPEX, Uponor, Rheem, Bradford White
HVAC: Carrier, Lennox, Trane, Goodman, Honeywell, Rheem

The transcript may contain speech-to-text errors, especially for brand names that sound similar to common words (e.g. "Kohler" may be transcribed as "cold air" or "coaler"; "Leviton" may become "lever on" or similar). When a material name in the transcript sounds phonetically similar to a known brand from the list above, and the context (item type) matches that brand's product category (e.g. faucets, outlets, wire), correct the brand field to the most likely intended brand rather than defaulting to "Generic". Only use "Generic" when no brand is mentioned or implied at all.`;
