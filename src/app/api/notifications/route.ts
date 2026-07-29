import { NextResponse } from "next/server";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/errors";
import {
  isNotificationType,
  type NotificationMetadata,
  type NotificationType,
} from "@/types/notification";

interface CreateNotificationBody {
  type?: string;
  message?: string;
  quoteId?: string | null;
  metadata?: NotificationMetadata;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as CreateNotificationBody;
    const type = body.type?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    const quoteId = body.quoteId?.trim() || null;
    const metadata = body.metadata ?? {};

    if (!isNotificationType(type)) {
      return NextResponse.json(
        { error: "Invalid notification type" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Notification message is required" },
        { status: 400 }
      );
    }

    if (quoteId) {
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("id")
        .eq("id", quoteId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (quoteError) {
        logSupabaseError("POST /api/notifications.quoteLookup", quoteError, {
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
    }

    const notificationId = await insertNotification({
      userId: user.id,
      type,
      message,
      quoteId,
      metadata,
      userScopedClient: supabase,
    });

    return NextResponse.json({ success: true, id: notificationId });
  } catch (error) {
    console.error("Create notification error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create notification",
      },
      { status: 500 }
    );
  }
}

async function insertNotification({
  userId,
  type,
  message,
  quoteId,
  metadata,
  userScopedClient,
}: {
  userId: string;
  type: NotificationType;
  message: string;
  quoteId: string | null;
  metadata: NotificationMetadata;
  userScopedClient: ReturnType<typeof createClient>;
}): Promise<string> {
  // Preferred: SECURITY DEFINER RPC (migration 014), same trust model as quote_accepted.
  const { data: rpcId, error: rpcError } = await userScopedClient.rpc(
    "create_notification",
    {
      p_type: type,
      p_message: message,
      p_quote_id: quoteId,
      p_metadata: metadata,
    }
  );

  if (!rpcError && rpcId) {
    return rpcId as string;
  }

  if (rpcError) {
    logSupabaseError("POST /api/notifications.rpc", rpcError, {
      type,
      quoteId,
      userId,
    });
  }

  // Fallback: service-role insert (same as /api/quotes/confirm).
  if (!isAdminClientConfigured()) {
    throw new Error(
      "Notification write path unavailable. Apply migration 014_create_notification_rpc.sql or set SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      quote_id: quoteId,
      message,
      metadata,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error) {
      logSupabaseError("POST /api/notifications.admin", error, {
        type,
        quoteId,
        userId,
      });
    }
    throw new Error("Failed to create notification");
  }

  return data.id as string;
}
