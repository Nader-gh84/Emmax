import { NextResponse } from "next/server";
import { isUuid } from "@/lib/app-url";
import {
  acknowledgeSupplierRequest,
  getSupplierAckByToken,
} from "@/lib/supplier-ack";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!isUuid(token)) {
      return NextResponse.json(
        { error: "Invalid acknowledgment link" },
        { status: 400 }
      );
    }

    const summary = await getSupplierAckByToken(token);

    if (!summary) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({
      quoteId: summary.quoteId,
      projectName: summary.projectName,
      companyName: summary.companyName,
      supplierName: summary.supplierName,
      supplierEmail: summary.supplierEmail,
      acknowledgedAt: summary.acknowledgedAt,
      alreadyAcknowledged: Boolean(summary.acknowledgedAt),
    });
  } catch (error) {
    console.error("[GET /api/supplier-ack] Failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load acknowledgment",
      },
      { status: 500 }
    );
  }
}

/**
 * RPC-only. Does not use an admin fallback that can mark success without a notification.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim() ?? "";

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!isUuid(token)) {
      return NextResponse.json(
        { error: "Invalid acknowledgment link" },
        { status: 400 }
      );
    }

    const result = await acknowledgeSupplierRequest(token);

    if (!result.success) {
      if (result.error === "not_found") {
        return NextResponse.json(
          { error: "Request not found" },
          { status: 404 }
        );
      }

      if (result.error === "invalid_token") {
        return NextResponse.json(
          { error: "Invalid acknowledgment link" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to acknowledge request",
          code: result.error ?? "acknowledge_failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyAcknowledged: Boolean(result.alreadyAcknowledged),
      acknowledgedAt: result.acknowledgedAt,
      quoteId: result.quoteId,
      supplierName: result.supplierName,
    });
  } catch (error) {
    console.error("[POST /api/supplier-ack] Failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to acknowledge request",
      },
      { status: 500 }
    );
  }
}
