import { NextResponse } from "next/server";
import type { QuoteEmailData } from "@/lib/email/quote-email";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate-quote-pdf";
import type { QuotePdfData } from "@/lib/pdf/quote-pdf";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuotePdfData;

    if (!body.customerName?.trim()) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!body.customerEmail?.trim()) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    if (!body.materials?.length) {
      return NextResponse.json(
        { error: "At least one line item is required" },
        { status: 400 }
      );
    }

    const quoteData: QuoteEmailData = {
      customerName: body.customerName,
      customerEmail: body.customerEmail,
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
