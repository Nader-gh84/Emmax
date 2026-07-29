import { NextResponse } from "next/server";
import { isUuid } from "@/lib/app-url";
import { declineQuoteByConfirmationToken } from "@/lib/quote-confirmation";

/**
 * RPC-only decline endpoint. Does not use an admin fallback that can mark the
 * quote declined without successfully inserting the quote_declined notification.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      reason?: string | null;
    };
    const token = body.token?.trim() ?? "";
    const reason = body.reason?.trim() || null;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!isUuid(token)) {
      return NextResponse.json(
        { error: "Invalid confirmation link" },
        { status: 400 }
      );
    }

    const result = await declineQuoteByConfirmationToken(token, reason);

    if (!result.success) {
      if (result.error === "not_found") {
        return NextResponse.json({ error: "Quote not found" }, { status: 404 });
      }

      if (result.error === "invalid_token") {
        return NextResponse.json(
          { error: "Invalid confirmation link" },
          { status: 400 }
        );
      }

      if (result.error === "already_accepted") {
        return NextResponse.json(
          { error: "This quote was already accepted and cannot be declined" },
          { status: 400 }
        );
      }

      if (result.error === "invalid_status") {
        return NextResponse.json(
          { error: "This quote cannot be declined" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to decline quote",
          code: result.error ?? "decline_failed",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyDeclined: Boolean(result.alreadyDeclined),
      declinedAt: result.declinedAt,
      quoteId: result.quoteId,
    });
  } catch (error) {
    console.error("[POST /api/quotes/decline] Failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to decline quote",
      },
      { status: 500 }
    );
  }
}
