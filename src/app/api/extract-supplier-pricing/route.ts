import { NextResponse } from "next/server";
import {
  SUPPLIER_PRICING_EXTRACTION_PROMPT,
  matchExtractedPricesToMaterials,
  type ExtractedSupplierPrice,
} from "@/lib/supplier-pricing";
import { createClient } from "@/lib/supabase/server";
import type { MaterialItem } from "@/types/quote";

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const TEXT_TYPES = new Set(["text/plain", "text/csv"]);

interface GptPricingResult {
  items?: Array<{
    description?: string;
    brand?: string | null;
    unitPrice?: number | string;
    unit?: string | null;
    quantity?: number | string | null;
    notes?: string | null;
  }>;
}

function parseUnitPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeExtracted(raw: GptPricingResult): ExtractedSupplierPrice[] {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const result: ExtractedSupplierPrice[] = [];

  for (const item of items) {
    const description = item.description?.trim() ?? "";
    const unitPrice = parseUnitPrice(item.unitPrice);
    if (!description || unitPrice == null || unitPrice < 0) continue;

    result.push({
      description,
      brand: item.brand?.trim() || undefined,
      unitPrice,
      unit: item.unit?.trim() || undefined,
      quantity:
        typeof item.quantity === "number"
          ? item.quantity
          : item.quantity != null
            ? Number(item.quantity) || undefined
            : undefined,
      notes: item.notes?.trim() || undefined,
    });
  }

  return result;
}

async function extractFromOpenAI(input: {
  apiKey: string;
  contentParts: Array<Record<string, unknown>>;
}): Promise<ExtractedSupplierPrice[]> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SUPPLIER_PRICING_EXTRACTION_PROMPT,
        },
        {
          role: "user",
          content: input.contentParts,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pricing extraction failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No extraction result from GPT");
  }

  return normalizeExtracted(JSON.parse(content) as GptPricingResult);
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local",
        },
        { status: 500 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const pastedText = String(formData.get("text") ?? "").trim();
    const materialsRaw = String(formData.get("materials") ?? "[]");

    let materials: MaterialItem[] = [];
    try {
      materials = JSON.parse(materialsRaw) as MaterialItem[];
    } catch {
      return NextResponse.json(
        { error: "Invalid materials payload" },
        { status: 400 }
      );
    }

    if (!Array.isArray(materials) || materials.length === 0) {
      return NextResponse.json(
        { error: "Add materials to the quote before uploading supplier pricing" },
        { status: 400 }
      );
    }

    const contentParts: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Match these quote materials when useful for context (do not invent missing prices):\n${JSON.stringify(
          materials.map(({ item, brand, quantity, unit }) => ({
            item,
            brand,
            quantity,
            unit,
          }))
        )}\n\nExtract every material unit price you can find from the supplier reply.`,
      },
    ];

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "File is too large (max 15MB)" },
          { status: 400 }
        );
      }

      const mime = file.type || "application/octet-stream";
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");

      if (IMAGE_TYPES.has(mime)) {
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${mime};base64,${base64}`,
          },
        });
      } else if (mime === "application/pdf") {
        // GPT-4o chat completions file input (PDF as data URL).
        contentParts.push({
          type: "file",
          file: {
            filename: file.name || "supplier-pricing.pdf",
            file_data: `data:application/pdf;base64,${base64}`,
          },
        });
      } else if (TEXT_TYPES.has(mime) || mime.startsWith("text/")) {
        contentParts.push({
          type: "text",
          text: `Supplier pricing text file (${file.name}):\n\n${buffer.toString("utf8")}`,
        });
      } else {
        return NextResponse.json(
          {
            error:
              "Unsupported file type. Upload a PDF, image (JPG/PNG), or plain text file.",
          },
          { status: 400 }
        );
      }
    } else if (pastedText) {
      contentParts.push({
        type: "text",
        text: `Supplier pricing text:\n\n${pastedText}`,
      });
    } else {
      return NextResponse.json(
        { error: "Upload a file or paste supplier pricing text" },
        { status: 400 }
      );
    }

    let extracted: ExtractedSupplierPrice[];
    try {
      extracted = await extractFromOpenAI({ apiKey, contentParts });
    } catch (error) {
      // PDF file-part may be rejected on some accounts — fall back to a clear error.
      const message =
        error instanceof Error ? error.message : "Pricing extraction failed";
      if (message.toLowerCase().includes("file") && file instanceof File) {
        return NextResponse.json(
          {
            error:
              "Couldn't read pricing from this file — try a clearer image/screenshot or paste the text, then try again.",
          },
          { status: 422 }
        );
      }
      throw error;
    }

    if (extracted.length === 0) {
      return NextResponse.json(
        {
          error:
            "Couldn't read pricing from this file — try a clearer image or enter prices manually.",
          rows: [],
          unmatchedExtracted: [],
          extractedCount: 0,
        },
        { status: 422 }
      );
    }

    const { rows, unmatchedExtracted } = matchExtractedPricesToMaterials(
      materials,
      extracted
    );

    return NextResponse.json({
      success: true,
      extractedCount: extracted.length,
      rows,
      unmatchedExtracted,
    });
  } catch (error) {
    console.error("Extract supplier pricing error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Couldn't read pricing from this file — try a clearer image or enter manually",
      },
      { status: 500 }
    );
  }
}
