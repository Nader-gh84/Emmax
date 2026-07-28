import { QuoteConfirmClient } from "./quote-confirm-client";

export default function QuoteConfirmPage({
  params,
}: {
  params: { token: string };
}) {
  return <QuoteConfirmClient token={params.token} />;
}
