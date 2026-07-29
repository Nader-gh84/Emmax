import { NextResponse } from "next/server";
import type { QuoteEmailData } from "@/lib/email/quote-email";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate-quote-pdf";
import type { QuotePdfData } from "@/lib/pdf/quote-pdf";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuotePdfData & {
      allowDraftPlaceholders?: boolean;
    };

    const materials = body.materials ?? [];
    const labourItems = body.labourItems ?? [];

    if (materials.length === 0 && labourItems.length === 0) {
      return NextResponse.json(
        { error: "At least one material or labour line item is required" },
        { status: 400 }
      );
    }

    const customerName =
      body.customerName?.trim() ||
      (body.allowDraftPlaceholders ? "Quote Draft" : "");
    const customerEmail =
      body.customerEmail?.trim() ||
      (body.allowDraftPlaceholders ? "draft@emax.local" : "");

    if (!customerName) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    const quoteData: QuoteEmailData = {
      customerName,
      customerEmail,
      projectName: body.projectName ?? "",
      notes: body.notes,
      validityDays: body.validityDays ?? 30,
      validUntil: body.validUntil ?? null,
      taxRate: body.taxRate ?? (body.gstRate ?? 5) + (body.pstRate ?? 7),
      gstRate: body.gstRate ?? 5,
      pstRate: body.pstRate ?? 7,
      discountMode: body.discountMode ?? "amount",
      discountAmount: body.discountAmount ?? 0,
      discountPercent: body.discountPercent ?? 0,
      priceDisplayMode: body.priceDisplayMode ?? "detailed",
      quoteNumber: body.quoteNumber ?? null,
      materials,
      labourItems,
    };

    const buffer = await generateQuotePdfBuffer({
      ...quoteData,
      customerPhone: body.customerPhone,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="quote.pdf"',
      },
    });
  } catch (error) {
    console.error("Generate PDF error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 }
    );
  }
}
