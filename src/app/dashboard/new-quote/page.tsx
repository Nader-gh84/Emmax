import type { Metadata } from "next";
import { NewQuoteWizard } from "@/components/quotes/new-quote-wizard";

export const metadata: Metadata = {
  title: "New Quote",
};

export default function NewQuotePage({
  searchParams,
}: {
  searchParams?: { id?: string };
}) {
  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-8">
      <NewQuoteWizard draftId={searchParams?.id} />
    </main>
  );
}
