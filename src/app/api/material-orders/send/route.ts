import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildMaterialOrderRequestEmailHtml } from "@/lib/email/material-order-email";
import { buildMaterialOrderConfirmUrlFromRequest } from "@/lib/material-order-confirmation";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";
import type { MaterialOrderLine } from "@/types/material-order";

interface SendMaterialOrderBody {
  projectId?: string;
  customerId?: string | null;
  supplierId?: string;
  projectName?: string;
  customerName?: string;
  notes?: string;
  requiredByDate?: string | null;
  deliveryOption?: string | null;
  projectReference?: string | null;
  materials?: Array<{
    id?: string;
    name?: string;
    partNumber?: string;
    brand?: string;
    supplier?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    status?: string;
  }>;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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

    const body = (await request.json()) as SendMaterialOrderBody;
    const projectId = body.projectId?.trim() ?? "";
    const customerId = body.customerId?.trim() || null;
    const supplierId = body.supplierId?.trim() ?? "";
    const projectName = body.projectName?.trim() || "Untitled project";
    const customerName = body.customerName?.trim() || "Customer";
    const notes = body.notes?.trim() || null;
    const requiredByDate = body.requiredByDate?.trim() || null;
    const deliveryOption = body.deliveryOption?.trim() || null;
    const projectReference = body.projectReference?.trim() || null;

    const materials: MaterialOrderLine[] = (body.materials ?? [])
      .map((row) => ({
        id: row.id,
        name: (row.name ?? "").trim(),
        partNumber: (row.partNumber ?? "").trim(),
        brand: (row.brand ?? "").trim(),
        supplier: (row.supplier ?? "").trim(),
        quantity: Number(row.quantity) || 0,
        unit: (row.unit ?? "ea").trim() || "ea",
        unitPrice: Number(row.unitPrice) || 0,
        status: row.status ?? "In Quote",
      }))
      .filter((row) => row.name && row.quantity > 0);

    if (!isUuid(projectId)) {
      return NextResponse.json(
        { error: "A valid project is required" },
        { status: 400 }
      );
    }

    if (!isUuid(supplierId)) {
      return NextResponse.json(
        { error: "Select a primary supplier from your Suppliers list" },
        { status: 400 }
      );
    }

    if (materials.length === 0) {
      return NextResponse.json(
        { error: "Add at least one material before sending the order" },
        { status: 400 }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, customer_id, project_name")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError) {
      logSupabaseError("POST /api/material-orders/send.project", projectError, {
        projectId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Failed to verify project" },
        { status: 500 }
      );
    }

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, supplier_name, email")
      .eq("id", supplierId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (supplierError) {
      logSupabaseError(
        "POST /api/material-orders/send.supplier",
        supplierError,
        { supplierId, userId: user.id }
      );
      return NextResponse.json(
        { error: "Failed to load supplier" },
        { status: 500 }
      );
    }

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const supplierEmail = supplier.email?.trim() ?? "";
    if (!supplierEmail || !isValidEmail(supplierEmail)) {
      return NextResponse.json(
        {
          error:
            "Selected supplier needs a valid email address before you can send an order",
        },
        { status: 400 }
      );
    }

    const supplierName = supplier.supplier_name?.trim() || "Supplier";
    const confirmationToken = crypto.randomUUID();
    const sentAt = new Date().toISOString();

    const { data: order, error: insertError } = await supabase
      .from("material_orders")
      .insert({
        user_id: user.id,
        project_id: projectId,
        customer_id: customerId || project.customer_id,
        supplier_id: supplierId,
        project_name: projectName || project.project_name || "Untitled project",
        customer_name: customerName,
        supplier_name: supplierName,
        supplier_email: supplierEmail,
        materials,
        notes,
        required_by_date: requiredByDate,
        delivery_option: deliveryOption,
        project_reference: projectReference,
        status: "sent",
        confirmation_token: confirmationToken,
        sent_at: sentAt,
        updated_at: sentAt,
      })
      .select("id, confirmation_token, status, sent_at")
      .single();

    if (insertError || !order) {
      logSupabaseError("POST /api/material-orders/send.insert", insertError, {
        projectId,
        supplierId,
      });
      const hint =
        insertError?.message?.includes("material_orders") ||
        insertError?.code === "42P01"
          ? " Run migration 020_material_orders.sql in Supabase."
          : "";
      return NextResponse.json(
        { error: `Failed to save material order.${hint}` },
        { status: 500 }
      );
    }

    const { data: profile } = await supabase
      .from("business_profiles")
      .select("company_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const companyName =
      profile?.company_name?.trim() || "Your contractor";
    const confirmUrl = buildMaterialOrderConfirmUrlFromRequest(
      order.confirmation_token,
      request
    );

    const html = buildMaterialOrderRequestEmailHtml({
      companyName,
      projectName: projectName || project.project_name || "Project",
      customerName,
      notes: notes ?? undefined,
      requiredByDate: requiredByDate ?? undefined,
      materials: materials.map((row) => ({
        name: row.name,
        brand: row.brand,
        quantity: row.quantity,
        unit: row.unit,
      })),
      confirmUrl,
    });

    try {
      const resend = new Resend(apiKey);
      const { error: emailError } = await resend.emails.send({
        from: "EmaX <onboarding@resend.dev>",
        to: [supplierEmail],
        subject: `Materials order — ${projectName || "Project"}`,
        html,
      });

      if (emailError) {
        console.error(
          "[POST /api/material-orders/send] Resend error:",
          emailError
        );
        await supabase.from("material_orders").delete().eq("id", order.id);
        return NextResponse.json(
          { error: "Failed to send order email to supplier" },
          { status: 500 }
        );
      }
    } catch (emailSendError) {
      console.error(
        "[POST /api/material-orders/send] Resend threw:",
        emailSendError
      );
      await supabase.from("material_orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Failed to send order email to supplier" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      sentAt: order.sent_at,
      confirmUrl,
    });
  } catch (error) {
    console.error("[POST /api/material-orders/send] Failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send material order",
      },
      { status: 500 }
    );
  }
}
