import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getBaseUrlFromRequest, isUuid } from "@/lib/app-url";
import {
  QuoteEmailData,
  buildQuoteEmailHtml,
} from "@/lib/email/quote-email";
import { buildQuoteAcceptUrl } from "@/lib/quote-confirmation";
import { generateQuotePdfBuffer } from "@/lib/pdf/generate-quote-pdf";
import { loadCompanyBrandingForPdfServer } from "@/lib/pdf/load-company-branding-server";

interface SendQuoteRequestBody extends QuoteEmailData {
  confirmationToken?: string;
  customerPhone?: string;
  // Never trust client-provided URLs in email content.
  acceptUrl?: string;
  pdfUrl?: string;
}

function pickQuoteEmailPayload(body: SendQuoteRequestBody): QuoteEmailData & {
  customerPhone?: string;
} {
  return {
    customerName: body.customerName.trim(),
    customerEmail: body.customerEmail.trim(),
    projectName: body.projectName?.trim() ?? "",
    notes: body.notes?.trim() || undefined,
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
    materials: body.materials ?? [],
    labourItems: body.labourItems ?? [],
    customerPhone: body.customerPhone?.trim() || undefined,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as SendQuoteRequestBody;
    const payload = pickQuoteEmailPayload(body);

    if (!payload.customerName) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!payload.customerEmail) {
      return NextResponse.json(
        { error: "Customer email is required" },
        { status: 400 }
      );
    }

    if (
      (!payload.materials || payload.materials.length === 0) &&
      (!payload.labourItems || payload.labourItems.length === 0)
    ) {
      return NextResponse.json(
        { error: "At least one line item is required" },
        { status: 400 }
      );
    }

    if (!body.confirmationToken || !isUuid(body.confirmationToken)) {
      return NextResponse.json(
        { error: "A valid confirmation token is required to send quote emails." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrlFromRequest(request);
    const acceptUrl = buildQuoteAcceptUrl(body.confirmationToken, baseUrl);

    const html = buildQuoteEmailHtml({
      ...payload,
      acceptUrl,
    });

    const company = await loadCompanyBrandingForPdfServer();
    const pdfBuffer = await generateQuotePdfBuffer({
      ...payload,
      company,
      template: company.quoteTemplate,
    });

    const resend = new Resend(apiKey);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? "EmaX <onboarding@resend.dev>";
    const projectLabel = payload.projectName || "Your Project";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [payload.customerEmail],
      subject: `Your Quote from EmaX — ${projectLabel}`,
      html,
      attachments: [
        {
          filename: "quote.pdf",
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id, acceptUrl });
  } catch (error) {
    console.error("Send quote error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send quote email",
      },
      { status: 500 }
    );
  }
}
