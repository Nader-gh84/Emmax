import type { Metadata } from "next";
import { NewQuoteWizard } from "@/components/quotes/new-quote-wizard";

export const metadata: Metadata = {
  title: "New Quote",
};

export default function NewQuotePage() {
  return (
    <main className="flex-1 p-6 lg:p-8">
      <NewQuoteWizard />
    </main>
  );
}
