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
        unitPrice: sanitizeNumber(material.unitPrice, 0),
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
    projectTitle: projectTitle.trim(),
  };
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
- materials.unitPrice: estimated CAD price per unit
- labourItems: put ALL labour/installation/rough-in/service time here (not in materials)
- labourItems.description: clear labour description (e.g. "Labour – Installation")
- labourItems.hours: numeric hours mentioned or reasonable default of 1
- labourItems.rate: estimated CAD hourly rate
- scopeOfWork: concise professional summary of the job scope
- projectTitle: short job title if the speaker names the project, customer, site, or job (e.g. "Kitchen renovation — Sara Emma"). Use an empty string if none is mentioned.

Common brand names to watch for (even if transcript spelling looks slightly off):
Electrical: Leviton, Legrand, Square D, Eaton, Siemens, GE, Southwire, Carlon, Milwaukee, DeWalt, Klein Tools, Nexans, Liteline
Plumbing: Kohler, Moen, Delta, American Standard, IPEX, Uponor, Rheem, Bradford White
HVAC: Carrier, Lennox, Trane, Goodman, Honeywell, Rheem

The transcript may contain speech-to-text errors, especially for brand names that sound similar to common words (e.g. "Kohler" may be transcribed as "cold air" or "coaler"; "Leviton" may become "lever on" or similar). When a material name in the transcript sounds phonetically similar to a known brand from the list above, and the context (item type) matches that brand's product category (e.g. faucets, outlets, wire), correct the brand field to the most likely intended brand rather than defaulting to "Generic". Only use "Generic" when no brand is mentioned or implied at all.`;
