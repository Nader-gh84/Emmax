"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QuotePreviewBody } from "@/components/quotes/quote-preview-body";
import { touchBtnSecondary } from "@/components/quotes/ui";
import { createClient } from "@/lib/supabase";
import {
  Quote,
  StoredMaterial,
  formatCurrency,
  formatQuoteDate,
  storedToMaterials,
} from "@/types/quote";

function getQuoteTitle(quote: Quote): string {
  return quote.project_name?.trim() || "Untitled quote";
}

function getQuoteCustomerLabel(quote: Quote): string {
  return quote.customer_name?.trim() || "No customer yet";
}

function StatusBadge({ status }: { status: Quote["status"] }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-emerald-400">
        Accepted
      </span>
    );
  }

  if (status === "declined") {
    return (
      <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-red-300">
        Declined
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-green-400">
        Sent
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-amber-300">
      Draft
    </span>
  );
}

function SentQuotePreviewModal({
  quote,
  onClose,
}: {
  quote: Quote;
  onClose: () => void;
}) {
  const materials = storedToMaterials(quote.materials as StoredMaterial[]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {getQuoteTitle(quote)}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {quote.status === "accepted"
                ? `Accepted ${quote.confirmed_at ? formatQuoteDate(quote.confirmed_at) : "—"}`
                : quote.status === "declined"
                  ? `Declined ${quote.declined_at ? formatQuoteDate(quote.declined_at) : "—"}`
                  : `Sent ${quote.sent_at ? formatQuoteDate(quote.sent_at) : "—"}`}
            </p>
          </div>
          <StatusBadge status={quote.status} />
        </div>

        <div className="mt-6">
          <QuotePreviewBody
            customerName={quote.customer_name ?? ""}
            customerEmail={quote.customer_email ?? ""}
            customerPhone={quote.customer_phone ?? ""}
            projectName={quote.project_name ?? ""}
            notes={quote.notes ?? ""}
            validityDays={quote.validity_days}
            materials={materials}
            subtotal={Number(quote.subtotal)}
            tax={Number(quote.tax)}
            grandTotal={Number(quote.grand_total)}
            taxRate={Number(quote.tax_rate)}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`${touchBtnSecondary} w-full sm:w-auto`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function QuoteRow({
  quote,
  onOpenSent,
}: {
  quote: Quote;
  onOpenSent: (quote: Quote) => void;
}) {
  const displayDate =
    quote.confirmed_at ??
    quote.sent_at ??
    quote.updated_at ??
    quote.created_at;
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">
            {getQuoteTitle(quote)}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {getQuoteCustomerLabel(quote)}
          </p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl font-bold text-accent">
          {formatCurrency(Number(quote.grand_total))}
        </p>
        <p className="text-sm text-slate-500">{formatQuoteDate(displayDate)}</p>
      </div>
    </>
  );

  if (quote.status === "draft") {
    return (
      <Link
        href={`/dashboard/voice-quote-builder?id=${quote.id}`}
        className="block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-accent/40 hover:bg-white/[0.07]"
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenSent(quote)}
      className="w-full rounded-xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-accent/40 hover:bg-white/[0.07]"
    >
      {content}
    </button>
  );
}

export default function QuotesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 flex-col items-center justify-center p-6 lg:p-8">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
          <p className="mt-4 text-base text-slate-400">Loading quotes...</p>
        </main>
      }
    >
      <QuotesPageContent />
    </Suspense>
  );
}

function QuotesPageContent() {
  // Drafts saved from the Materials step (status='draft') appear in this list
  // alongside sent and accepted quotes. Consider adding a filter/tab to highlight drafts.
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);

  const loadQuotes = useCallback(async () => {
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Failed to load quotes. Please try again.");
      return;
    }

    setQuotes((data as Quote[]) ?? []);
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await loadQuotes();
      setIsLoading(false);
    }

    init();
  }, [loadQuotes]);

  useEffect(() => {
    const quoteId = searchParams.get("quote");
    if (!quoteId || quotes.length === 0) return;

    const matchedQuote = quotes.find((quote) => quote.id === quoteId);
    if (matchedQuote && matchedQuote.status !== "draft") {
      setPreviewQuote(matchedQuote);
    }
  }, [quotes, searchParams]);

  if (isLoading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-6 lg:p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
        <p className="mt-4 text-base text-slate-400">Loading quotes...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotes</h1>
          <p className="mt-2 text-base text-slate-400">
            Review drafts, sent, and accepted quotes.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
            {error}
          </div>
        )}

        {quotes.length === 0 ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <p className="text-base text-slate-400">
              No quotes yet. Create your first quote to get started.
            </p>
            <Link
              href="/dashboard/voice-quote-builder"
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-accent px-6 text-base font-medium text-white transition hover:bg-accent/90"
            >
              New Quote
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {quotes.map((quote) => (
              <QuoteRow
                key={quote.id}
                quote={quote}
                onOpenSent={setPreviewQuote}
              />
            ))}
          </div>
        )}
      </div>

      {previewQuote && (
        <SentQuotePreviewModal
          quote={previewQuote}
          onClose={() => setPreviewQuote(null)}
        />
      )}
    </main>
  );
}
