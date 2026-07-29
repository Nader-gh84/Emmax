import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  buildSupplierRequestEmailHtml,
  toSupplierMaterialLines,
  type SupplierMaterialLine,
} from "@/lib/email/supplier-email";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";
import { buildSupplierAckUrlFromRequest } from "@/lib/supplier-ack";

interface SendSupplierRequestBody {
  supplierName?: string;
  supplierEmail?: string;
  messageBody?: string;
  projectName?: string;
  quoteId?: string | null;
  materials?: Array<{
    item?: string;
    brand?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
  }>;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SendSupplierRequestBody;
    const supplierName = body.supplierName?.trim() ?? "";
    const supplierEmail = body.supplierEmail?.trim() ?? "";
    const messageBody = body.messageBody?.trim() ?? "";
    const projectName = body.projectName?.trim() ?? "";
    const quoteId = body.quoteId?.trim() || null;

    const materials = toSupplierMaterialLines(
      (body.materials ?? [])
        .filter((item) => (item.item ?? "").trim() || Number(item.quantity) > 0)
        .map((item) => ({
          item: item.item ?? "",
          brand: item.brand ?? "",
          quantity: Number(item.quantity) || 0,
          unit: item.unit ?? "each",
        }))
    );

    if (!supplierName) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    if (!supplierEmail || !isValidEmail(supplierEmail)) {
      return NextResponse.json(
        { error: "A valid supplier email is required" },
        { status: 400 }
      );
    }

    if (!messageBody) {
      return NextResponse.json(
        { error: "Message body is required" },
        { status: 400 }
      );
    }

    if (materials.length === 0) {
      return NextResponse.json(
        { error: "Add at least one material before sending to a supplier" },
        { status: 400 }
      );
    }

    if (!quoteId) {
      return NextResponse.json(
        { error: "Quote must be saved before sending to a supplier" },
        { status: 400 }
      );
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", quoteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (quoteError) {
      logSupabaseError("POST /api/send-supplier.quoteLookup", quoteError, {
        quoteId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Failed to verify quote" },
        { status: 500 }
      );
    }

    if (!quote) {
      return NextResponse.json(
        { error: "Quote not found or access denied" },
        { status: 404 }
      );
    }

    // Mint a fresh acknowledgment token for this send (clears any prior ack).
    const supplierAckToken = crypto.randomUUID();
    const { error: tokenError } = await supabase
      .from("quotes")
      .update({
        supplier_ack_token: supplierAckToken,
        supplier_acknowledged_at: null,
        supplier_ack_supplier_name: supplierName,
        supplier_ack_supplier_email: supplierEmail,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId)
      .eq("user_id", user.id);

    if (tokenError) {
      logSupabaseError("POST /api/send-supplier.ackToken", tokenError, {
        quoteId,
        userId: user.id,
      });
      return NextResponse.json(
        {
          error:
            "Failed to prepare supplier acknowledgment link. Run migration 015_supplier_acknowledgment.sql if you have not already.",
        },
        { status: 500 }
      );
    }

    const acknowledgeUrl = buildSupplierAckUrlFromRequest(
      supplierAckToken,
      request
    );

    const { data: profile } = await supabase
      .from("business_profiles")
      .select("company_name, email, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const companyName = profile?.company_name?.trim() || "EmaX";
    const replyTo = profile?.email?.trim() || user.email || undefined;

    const html = buildSupplierRequestEmailHtml({
      messageBody,
      materials,
      projectName,
      companyName,
      acknowledgeUrl,
    });

    const resend = new Resend(apiKey);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? "EmaX <onboarding@resend.dev>";
    const projectLabel = projectName || "Materials list";

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [supplierEmail],
      ...(replyTo ? { replyTo } : {}),
      subject: `Material pricing request — ${projectLabel}`,
      html,
      text: buildPlainTextEmail(messageBody, materials, acknowledgeUrl),
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to send supplier email" },
        { status: 500 }
      );
    }

    const notificationMessage = `Sent materials list to ${supplierName} — awaiting pricing`;
    const metadata = {
      supplier_name: supplierName,
      supplier_email: supplierEmail,
      item_count: materials.length,
    };

    const notificationId = await createSupplierNotification({
      userId: user.id,
      message: notificationMessage,
      quoteId,
      metadata,
      userScopedClient: supabase,
    });

    return NextResponse.json({
      success: true,
      id: data?.id,
      notificationId,
      acknowledgeUrl,
    });
  } catch (error) {
    console.error("Send supplier error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send supplier email",
      },
      { status: 500 }
    );
  }
}

function buildPlainTextEmail(
  messageBody: string,
  materials: SupplierMaterialLine[],
  acknowledgeUrl?: string
): string {
  const lines = materials.map((material) => {
    const brand = material.brand?.trim() ? ` (${material.brand.trim()})` : "";
    return `- ${material.quantity} ${material.unit} ${material.item.trim() || "Material"}${brand}`;
  });

  return [
    messageBody.trim(),
    "",
    "Materials list:",
    ...lines,
    "",
    ...(acknowledgeUrl
      ? [
          "I received this — pricing coming soon:",
          acknowledgeUrl,
          "",
        ]
      : []),
    "Sent via EmaX",
  ].join("\n");
}

async function createSupplierNotification({
  userId,
  message,
  quoteId,
  metadata,
  userScopedClient,
}: {
  userId: string;
  message: string;
  quoteId: string | null;
  metadata: {
    supplier_name: string;
    supplier_email: string;
    item_count: number;
  };
  userScopedClient: ReturnType<typeof createClient>;
}): Promise<string | null> {
  const { data: rpcId, error: rpcError } = await userScopedClient.rpc(
    "create_notification",
    {
      p_type: "supplier_price",
      p_message: message,
      p_quote_id: quoteId,
      p_metadata: metadata,
    }
  );

  if (!rpcError && rpcId) {
    return rpcId as string;
  }

  if (rpcError) {
    logSupabaseError("POST /api/send-supplier.notificationRpc", rpcError, {
      quoteId,
      userId,
    });
  }

  if (!isAdminClientConfigured()) {
    console.error(
      "[send-supplier] Notification write unavailable after email send"
    );
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      type: "supplier_price",
      quote_id: quoteId,
      message,
      metadata,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error) {
      logSupabaseError("POST /api/send-supplier.notificationAdmin", error, {
        quoteId,
        userId,
      });
    }
    return null;
  }

  return data.id as string;
}
