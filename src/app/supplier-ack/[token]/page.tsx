import { isUuid } from "@/lib/app-url";
import { getSupplierAckByToken } from "@/lib/supplier-ack";
import { SupplierAckClient } from "./supplier-ack-client";

export default async function SupplierAckPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token?.trim() ?? "";
  let initialError: string | null = null;
  let initialSummary = null;

  if (!isUuid(token)) {
    initialError = "Invalid acknowledgment link.";
  } else {
    try {
      initialSummary = await getSupplierAckByToken(token);
      if (!initialSummary) {
        initialError = "This acknowledgment link is no longer valid.";
      }
    } catch (error) {
      console.error("[SupplierAckPage] Failed to load:", error);
      initialError =
        error instanceof Error
          ? error.message
          : "Failed to load acknowledgment.";
    }
  }

  return (
    <SupplierAckClient
      token={token}
      initialSummary={initialSummary}
      initialError={initialError}
    />
  );
}
