import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getAppBaseUrl, isUuid } from "@/lib/app-url";
import { buildMaterialsConfirmedEmailHtml } from "@/lib/email/material-order-email";
import {
  confirmMaterialOrderByToken,
  getPublicMaterialOrderByToken,
} from "@/lib/material-order-confirmation";
import { formatAvailabilityLabel } from "@/types/material-order";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!isUuid(token)) {
      return NextResponse.json(
        { error: "Invalid confirmation link" },
        { status: 400 }
      );
    }

    const order = await getPublicMaterialOrderByToken(token);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[GET /api/material-orders/confirm] Failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load material order",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      availabilityDate?: string;
      availabilityTime?: string;
      branchLocation?: string;
    };

    const token = body.token?.trim() ?? "";
    const availabilityDate = body.availabilityDate?.trim() ?? "";
    const availabilityTime = body.availabilityTime?.trim() ?? "";
    const branchLocation = body.branchLocation?.trim() ?? "";

    if (!isUuid(token)) {
      return NextResponse.json(
        { error: "Invalid confirmation link" },
        { status: 400 }
      );
    }

    if (!availabilityDate || !availabilityTime || !branchLocation) {
      return NextResponse.json(
        {
          error:
            "Availability date, time, and branch/pickup location are required",
        },
        { status: 400 }
      );
    }

    const result = await confirmMaterialOrderByToken({
      token,
      availabilityDate,
      availabilityTime,
      branchLocation,
    });

    if (result.error === "not_found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (result.error === "invalid_status") {
      return NextResponse.json(
        { error: "This order cannot be confirmed" },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to confirm material order" },
        { status: 500 }
      );
    }

    if (!result.alreadyConfirmed) {
      await sendContractorMaterialsConfirmedEmail({
        contractorEmail: result.contractorEmail ?? "",
        supplierName: result.supplierName ?? "Supplier",
        projectName: result.projectName ?? "your project",
        availabilityDate: result.availabilityDate ?? availabilityDate,
        availabilityTime: result.availabilityTime ?? availabilityTime,
        branchLocation: result.branchLocation ?? branchLocation,
        projectId: result.projectId ?? null,
        customerId: result.customerId ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      alreadyConfirmed: Boolean(result.alreadyConfirmed),
      confirmedAt: result.confirmedAt,
      availabilityDate: result.availabilityDate,
      availabilityTime: result.availabilityTime,
      branchLocation: result.branchLocation,
    });
  } catch (error) {
    console.error("[POST /api/material-orders/confirm] Failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to confirm material order",
      },
      { status: 500 }
    );
  }
}

async function sendContractorMaterialsConfirmedEmail(input: {
  contractorEmail: string;
  supplierName: string;
  projectName: string;
  availabilityDate: string;
  availabilityTime: string;
  branchLocation: string;
  projectId: string | null;
  customerId: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const email = input.contractorEmail.trim();
  if (!apiKey || !email) {
    console.warn(
      "[material-orders/confirm] Skipping contractor email — missing API key or email"
    );
    return;
  }

  const dateLabel = formatAvailabilityLabel(
    input.availabilityDate,
    null
  ).replace("—", input.availabilityDate);

  let dashboardUrl = `${getAppBaseUrl()}/dashboard`;
  if (input.customerId && input.projectId) {
    dashboardUrl = `${getAppBaseUrl()}/dashboard/customers/${input.customerId}/projects/${input.projectId}`;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: "EmaX <onboarding@resend.dev>",
      to: [email],
      subject: `Materials confirmed — ${input.projectName}`,
      html: buildMaterialsConfirmedEmailHtml({
        supplierName: input.supplierName,
        projectName: input.projectName,
        availabilityDate: dateLabel,
        availabilityTime: input.availabilityTime,
        branchLocation: input.branchLocation,
        dashboardUrl,
      }),
    });
  } catch (error) {
    console.error(
      "[material-orders/confirm] Failed to email contractor:",
      error
    );
  }
}
