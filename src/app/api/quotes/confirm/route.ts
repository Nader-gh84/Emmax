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

    // Prefer RPC so accept + notification + project creation stay atomic.
    try {
      return await confirmQuoteWithRpc(token);
    } catch (rpcError) {
      const message =
        rpcError instanceof Error ? rpcError.message : String(rpcError);
      const rpcMissing =
        message.includes("not configured") ||
        message.includes("42883") ||
        message.includes("confirm_quote_by_confirmation_token");
      // Old RPC (pre-023/033) inserts projects blindly and hits
      // projects_quote_id_key when a pre-accept project already exists.
      const duplicateProject =
        message.includes("23505") ||
        message.includes("projects_quote_id_key");

      if ((rpcMissing || duplicateProject) && isAdminClientConfigured()) {
        console.warn(
          "[POST /api/quotes/confirm] RPC unavailable or duplicate project; falling back to admin path",
          { duplicateProject, rpcMissing }
        );
        return confirmQuoteWithAdmin(token);
      }

      throw rpcError;
    }
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
  // Same fallback chain as confirm_quote_by_confirmation_token (migration 019).
  const projectName =
    quote.project_name?.trim() ||
    quote.quote_number?.trim() ||
    "Untitled project";
  const message = `${customerName} accepted your quote for ${
    quote.project_name?.trim() || "your project"
  }.`;

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
    await admin
      .from("quotes")
      .update({
        status: "sent",
        confirmed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);
    return NextResponse.json(
      { error: "Failed to confirm quote" },
      { status: 500 }
    );
  }

  // Prefer update when a pre-accept project already exists for this quote_id
  // (created by ensureProjectForQuote). Avoids projects_quote_id_key (23505).
  const { data: existingProject, error: existingProjectError } = await admin
    .from("projects")
    .select("id")
    .eq("quote_id", quote.id)
    .maybeSingle();

  if (existingProjectError) {
    logSupabaseError(
      "POST /api/quotes/confirm.admin.projectLookup",
      existingProjectError,
      { token, quoteId: quote.id }
    );
  }

  let projectError: import("@supabase/supabase-js").PostgrestError | null =
    null;

  if (existingProject?.id) {
    const { error } = await admin
      .from("projects")
      .update({
        customer_id: quote.customer_id,
        project_name: projectName,
        value: Number(quote.grand_total) || 0,
        materials: quote.materials ?? [],
        labour_items: quote.labour_items ?? [],
        updated_at: confirmedAt,
      })
      .eq("id", existingProject.id);
    projectError = error;
  } else {
    const { error } = await admin.from("projects").insert({
      user_id: quote.user_id,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      project_name: projectName,
      value: Number(quote.grand_total) || 0,
      status: "active",
      start_date: confirmedAt.slice(0, 10),
      materials: quote.materials ?? [],
      labour_items: quote.labour_items ?? [],
      updated_at: confirmedAt,
    });
    projectError = error;

    // Race: another request created the project between lookup and insert.
    if (projectError?.code === "23505") {
      const { error: retryError } = await admin
        .from("projects")
        .update({
          customer_id: quote.customer_id,
          project_name: projectName,
          value: Number(quote.grand_total) || 0,
          materials: quote.materials ?? [],
          labour_items: quote.labour_items ?? [],
          updated_at: confirmedAt,
        })
        .eq("quote_id", quote.id);
      projectError = retryError;
    }
  }

  if (projectError) {
    logSupabaseError("POST /api/quotes/confirm.admin.project", projectError, {
      token,
      quoteId: quote.id,
    });
    await admin.from("notifications").delete().eq("quote_id", quote.id).eq(
      "type",
      "quote_accepted"
    );
    await admin
      .from("quotes")
      .update({
        status: "sent",
        confirmed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);
    return NextResponse.json(
      {
        error:
          "Failed to create project from accepted quote. Run migration 033_confirm_quote_project_upsert.sql (or 023).",
      },
      { status: 500 }
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
