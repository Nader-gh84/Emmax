import { isUuid } from "@/lib/app-url";
import { getPublicMaterialOrderByToken } from "@/lib/material-order-confirmation";
import { OrderConfirmClient } from "./order-confirm-client";

export default async function OrderConfirmPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token?.trim() ?? "";
  let initialError: string | null = null;
  let initialOrder = null;

  if (!isUuid(token)) {
    console.error("[OrderConfirmPage] Invalid token in URL:", { token });
    initialError = "Invalid confirmation link.";
  } else {
    try {
      initialOrder = await getPublicMaterialOrderByToken(token);
      if (!initialOrder) {
        console.error("[OrderConfirmPage] Order not found for token:", {
          token,
        });
        initialError = "Order not found.";
      }
    } catch (error) {
      console.error("[OrderConfirmPage] Failed to load order:", error);
      initialError =
        error instanceof Error ? error.message : "Failed to load order.";
    }
  }

  return (
    <OrderConfirmClient
      token={token}
      initialOrder={initialOrder}
      initialError={initialError}
    />
  );
}
