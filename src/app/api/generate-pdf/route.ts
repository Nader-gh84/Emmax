import { NextResponse } from "next/server";
import type { QuoteEmailData } from "@/lib/email/quote-email";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate-quote-pdf";
import type { QuotePdfData } from "@/lib/pdf/quote-pdf";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuotePdfData & {
      allowDraftPlaceholders?: boolean;
    };

    if (!body.materials?.length) {
      return NextResponse.json(
        { error: "At least one line item is required" },
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
      taxRate: body.taxRate ?? 13,
      materials: body.materials,
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
