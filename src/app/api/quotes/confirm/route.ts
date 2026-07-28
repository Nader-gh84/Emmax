import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAppBaseUrl } from "@/lib/app-url";
import { buildQuoteAcceptedEmailHtml } from "@/lib/email/quote-email";
import {
  buildQuoteDashboardUrl,
  getQuoteByConfirmationToken,
} from "@/lib/quote-confirmation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/types/quote";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const quote = await getQuoteByConfirmationToken(token);

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("Fetch quote confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to load quote" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: quote, error: fetchError } = await admin
      .from("quotes")
      .select("*")
      .eq("confirmation_token", token)
      .maybeSingle();

    if (fetchError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.status === "accepted") {
      return NextResponse.json({
        success: true,
        alreadyAccepted: true,
        confirmedAt: quote.confirmed_at,
      });
    }

    if (quote.status !== "sent") {
      return NextResponse.json(
        { error: "This quote cannot be confirmed" },
        { status: 400 }
      );
    }

    const confirmedAt = new Date().toISOString();

    const { error: updateError } = await admin
      .from("quotes")
      .update({
        status: "accepted",
        confirmed_at: confirmedAt,
        updated_at: confirmedAt,
      })
      .eq("id", quote.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to confirm quote" },
        { status: 500 }
      );
    }

    const customerName = quote.customer_name?.trim() || "Your customer";
    const projectName = quote.project_name?.trim() || "your project";
    const message = `${customerName} accepted your quote for ${projectName}.`;

    await admin.from("notifications").insert({
      user_id: quote.user_id,
      type: "quote_accepted",
      quote_id: quote.id,
      message,
    });

    const { data: profile } = await admin
      .from("business_profiles")
      .select("email, company_name")
      .eq("user_id", quote.user_id)
      .maybeSingle();

    let contractorEmail = profile?.email?.trim() || "";

    if (!contractorEmail) {
      const { data: authUser } = await admin.auth.admin.getUserById(
        quote.user_id
      );
      contractorEmail = authUser.user?.email ?? "";
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (apiKey && contractorEmail) {
      const resend = new Resend(apiKey);
      const fromEmail =
        process.env.RESEND_FROM_EMAIL ?? "EmaX <onboarding@resend.dev>";
      const dashboardUrl = buildQuoteDashboardUrl(quote.id);
      const html = buildQuoteAcceptedEmailHtml({
        customerName,
        projectName,
        grandTotal: formatCurrency(Number(quote.grand_total)),
        dashboardUrl,
      });

      await resend.emails.send({
        from: fromEmail,
        to: [contractorEmail],
        subject: `Quote Accepted — ${projectName}`,
        html,
      });
    }

    return NextResponse.json({
      success: true,
      confirmedAt,
      dashboardUrl: `${getAppBaseUrl()}/dashboard/quotes?quote=${quote.id}`,
    });
  } catch (error) {
    console.error("Confirm quote error:", error);
    return NextResponse.json(
      { error: "Failed to confirm quote" },
      { status: 500 }
    );
  }
}
