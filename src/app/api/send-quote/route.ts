import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  QuoteEmailData,
  buildQuoteEmailHtml,
} from "@/lib/email/quote-email";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as QuoteEmailData;

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

    const resend = new Resend(apiKey);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? "EmaX <onboarding@resend.dev>";
    const projectLabel = body.projectName?.trim() || "Your Project";
    const html = buildQuoteEmailHtml({
      ...body,
      validityDays: body.validityDays ?? 30,
      taxRate: body.taxRate ?? 13,
    });

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [body.customerEmail.trim()],
      subject: `Your Quote from EmaX — ${projectLabel}`,
      html,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
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
