import { getQuoteByConfirmationToken } from "@/lib/quote-confirmation";
import { isUuid } from "@/lib/app-url";
import { QuoteConfirmClient } from "./quote-confirm-client";

export default async function QuoteConfirmPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token?.trim() ?? "";
  let initialError: string | null = null;
  let initialQuote = null;

  if (!isUuid(token)) {
    console.error("[QuoteConfirmPage] Invalid token in URL:", { token });
    initialError = "Invalid confirmation link.";
  } else {
    try {
      initialQuote = await getQuoteByConfirmationToken(token);

      if (!initialQuote) {
        console.error("[QuoteConfirmPage] Quote not found for token:", { token });
        initialError = "Quote not found.";
      }
    } catch (error) {
      console.error("[QuoteConfirmPage] Failed to load quote:", error);
      initialError =
        error instanceof Error ? error.message : "Failed to load quote.";
    }
  }

  return (
    <QuoteConfirmClient
      token={token}
      initialQuote={initialQuote}
      initialError={initialError}
    />
  );
}
