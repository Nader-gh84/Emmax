import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id?.trim() ?? "";
    if (!isUuid(orderId)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing, error: loadError } = await supabase
      .from("material_orders")
      .select("id, status, materials_received_at, project_id")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (loadError) {
      logSupabaseError(
        "POST /api/material-orders/[id]/mark-received.load",
        loadError,
        { orderId }
      );
      return NextResponse.json(
        { error: "Failed to load material order" },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existing.status !== "confirmed") {
      return NextResponse.json(
        {
          error:
            "Supplier must confirm availability before you can mark materials received",
        },
        { status: 400 }
      );
    }

    if (existing.materials_received_at) {
      return NextResponse.json({
        success: true,
        alreadyReceived: true,
        materialsReceivedAt: existing.materials_received_at,
      });
    }

    const receivedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("material_orders")
      .update({
        materials_received_at: receivedAt,
        updated_at: receivedAt,
      })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .select("id, materials_received_at, status")
      .maybeSingle();

    if (error) {
      logSupabaseError(
        "POST /api/material-orders/[id]/mark-received.update",
        error,
        { orderId }
      );
      const hint =
        error.message?.includes("materials_received_at") ||
        error.code === "42703"
          ? " Run migration 021_project_start_flow.sql in Supabase."
          : "";
      return NextResponse.json(
        { error: `Failed to mark materials received.${hint}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existing.project_id) {
      const { logProjectActivity } = await import("@/lib/project-activity");
      await logProjectActivity(supabase, {
        userId: user.id,
        projectId: existing.project_id,
        activityType: "materials_received",
        description: "Materials marked as received",
      });
    }

    return NextResponse.json({
      success: true,
      alreadyReceived: false,
      materialsReceivedAt: data.materials_received_at,
      status: data.status,
    });
  } catch (error) {
    console.error("[POST /api/material-orders/[id]/mark-received]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark materials received",
      },
      { status: 500 }
    );
  }
}
