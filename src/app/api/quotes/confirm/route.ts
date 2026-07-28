import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAppBaseUrl, isUuid } from "@/lib/app-url";
import { buildQuoteAcceptedEmailHtml } from "@/lib/email/quote-email";
import {
  buildQuoteDashboardUrl,
  confirmQuoteByConfirmationToken,
  getQuoteByConfirmationToken,
} from "@/lib/quote-confirmation";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { logSupabaseError } from "@/lib/supabase/errors";
import { formatCurrency } from "@/types/quote";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!isUuid(token)) {
      console.error("[GET /api/quotes/confirm] Invalid token format:", { token });
      return NextResponse.json({ error: "Invalid confirmation link" }, { status: 400 });
    }

    const quote = await getQuoteByConfirmationToken(token);

    if (!quote) {
      console.error("[GET /api/quotes/confirm] Quote not found for token:", {
        token,
      });
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("[GET /api/quotes/confirm] Failed to load quote:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load quote",
      },
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

    if (!isUuid(token)) {
      console.error("[POST /api/quotes/confirm] Invalid token format:", { token });
      return NextResponse.json({ error: "Invalid confirmation link" }, { status: 400 });
    }

    if (isAdminClientConfigured()) {
      return confirmQuoteWithAdmin(token);
    }

    return confirmQuoteWithRpc(token);
  } catch (error) {
    console.error("[POST /api/quotes/confirm] Failed to confirm quote:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to confirm quote",
      },
      { status: 500 }
    );
  }
}

async function confirmQuoteWithRpc(token: string) {
  const result = await confirmQuoteByConfirmationToken(token);

  if (result.error === "not_found") {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (result.error === "invalid_status") {
    return NextResponse.json(
      { error: "This quote cannot be confirmed" },
      { status: 400 }
    );
  }

  if (result.already_accepted) {
    return NextResponse.json({
      success: true,
      alreadyAccepted: true,
      confirmedAt: result.confirmed_at,
    });
  }

  if (!result.success || !result.quote_id) {
    return NextResponse.json(
      { error: "Failed to confirm quote" },
      { status: 500 }
    );
  }

  await sendContractorAcceptedEmail({
    contractorEmail: result.contractor_email ?? "",
    userId: result.user_id ?? "",
    customerName: result.customer_name?.trim() || "Your customer",
    projectName: result.project_name?.trim() || "your project",
    grandTotal: formatCurrency(Number(result.grand_total ?? 0)),
    quoteId: result.quote_id,
  });

  return NextResponse.json({
    success: true,
    confirmedAt: result.confirmed_at,
    dashboardUrl: `${getAppBaseUrl()}/dashboard/quotes?quote=${result.quote_id}`,
  });
}

async function confirmQuoteWithAdmin(token: string) {
  const admin = createAdminClient();
  const { data: quote, error: fetchError } = await admin
    .from("quotes")
    .select("*")
    .eq("confirmation_token", token)
    .maybeSingle();

  if (fetchError) {
    logSupabaseError("POST /api/quotes/confirm.admin.fetch", fetchError, {
      token,
    });
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (!quote) {
    console.error("[POST /api/quotes/confirm] Quote not found for token:", {
      token,
    });
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
    logSupabaseError("POST /api/quotes/confirm.admin.update", updateError, {
      token,
      quoteId: quote.id,
    });
    return NextResponse.json(
      { error: "Failed to confirm quote" },
      { status: 500 }
    );
  }

  const customerName = quote.customer_name?.trim() || "Your customer";
  const projectName = quote.project_name?.trim() || "your project";
  const message = `${customerName} accepted your quote for ${projectName}.`;

  const { error: notificationError } = await admin.from("notifications").insert({
    user_id: quote.user_id,
    type: "quote_accepted",
    quote_id: quote.id,
    message,
  });

  if (notificationError) {
    logSupabaseError(
      "POST /api/quotes/confirm.admin.notification",
      notificationError,
      { token, quoteId: quote.id }
    );
  }

  const { data: profile } = await admin
    .from("business_profiles")
    .select("email, company_name")
    .eq("user_id", quote.user_id)
    .maybeSingle();

  let contractorEmail = profile?.email?.trim() || "";

  if (!contractorEmail) {
    const { data: authUser, error: authError } = await admin.auth.admin.getUserById(
      quote.user_id
    );

    if (authError) {
      console.error("[POST /api/quotes/confirm.admin.authUser]", {
        message: authError.message,
        quoteId: quote.id,
        userId: quote.user_id,
      });
    }

    contractorEmail = authUser.user?.email ?? "";
  }

  await sendContractorAcceptedEmail({
    contractorEmail,
    userId: quote.user_id,
    customerName,
    projectName,
    grandTotal: formatCurrency(Number(quote.grand_total)),
    quoteId: quote.id,
  });

  return NextResponse.json({
    success: true,
    confirmedAt,
    dashboardUrl: `${getAppBaseUrl()}/dashboard/quotes?quote=${quote.id}`,
  });
}

async function sendContractorAcceptedEmail({
  contractorEmail,
  userId,
  customerName,
  projectName,
  grandTotal,
  quoteId,
}: {
  contractorEmail: string;
  userId: string;
  customerName: string;
  projectName: string;
  grandTotal: string;
  quoteId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey || !contractorEmail) {
    if (!contractorEmail) {
      console.warn(
        "[POST /api/quotes/confirm] Skipping contractor email; no address for user:",
        userId
      );
    }
    return;
  }

  const resend = new Resend(apiKey);
  const fromEmail =
    process.env.RESEND_FROM_EMAIL ?? "EmaX <onboarding@resend.dev>";
  const dashboardUrl = buildQuoteDashboardUrl(quoteId);
  const html = buildQuoteAcceptedEmailHtml({
    customerName,
    projectName,
    grandTotal,
    dashboardUrl,
  });

  await resend.emails.send({
    from: fromEmail,
    to: [contractorEmail],
    subject: `Quote Accepted — ${projectName}`,
    html,
  });
}
