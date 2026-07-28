"use client";

import { useEffect, useState } from "react";
import {
  formatCurrency,
  formatQuoteDate,
  materialLineTotal,
  storedToMaterials,
  type StoredMaterial,
} from "@/types/quote";
import { touchBtnPrimary } from "@/components/quotes/ui";

interface PublicQuoteSummary {
  id: string;
  status: "draft" | "sent" | "accepted";
  project_name: string | null;
  customer_name: string | null;
  materials: StoredMaterial[];
  tax_rate: number;
  grand_total: number;
  confirmed_at: string | null;
  company_name: string;
}

export function QuoteConfirmClient({ token }: { token: string }) {
  const [quote, setQuote] = useState<PublicQuoteSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function loadQuote() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/quotes/confirm?token=${encodeURIComponent(token)}`
        );
        const data = await response.json();

        if (!response.ok) {
          setQuote(null);
          setError(data.error || "This link is no longer valid.");
          return;
        }

        setQuote(data.quote);
        if (data.quote.status === "accepted") {
          setConfirmedAt(data.quote.confirmed_at);
        }
      } catch {
        setError("This link is no longer valid.");
      } finally {
        setIsLoading(false);
      }
    }

    loadQuote();
  }, [token]);

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);

    try {
      const response = await fetch("/api/quotes/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm quote");
      }

      setConfirmedAt(data.confirmedAt ?? new Date().toISOString());
      setIsSuccess(true);
      if (quote) {
        setQuote({ ...quote, status: "accepted" });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm quote"
      );
    } finally {
      setIsConfirming(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
          <p className="mt-4 text-base text-slate-400">Loading quote...</p>
        </div>
      </main>
    );
  }

  if (!quote || error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Link unavailable</h1>
          <p className="mt-3 text-base text-slate-400">
            {error || "This link is no longer valid."}
          </p>
        </div>
      </main>
    );
  }

  const materials = storedToMaterials(quote.materials);
  const projectName = quote.project_name?.trim() || "Your Project";

  if (quote.status === "accepted" || isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="w-full max-w-lg rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            {isSuccess
              ? "Thanks! The contractor has been notified."
              : "Quote already confirmed"}
          </h1>
          <p className="mt-3 text-base text-slate-300">
            {isSuccess
              ? "Your confirmation is complete."
              : confirmedAt
                ? `You already confirmed this quote on ${formatQuoteDate(confirmedAt)}.`
                : "This quote has already been accepted."}
          </p>
        </div>
      </main>
    );
  }

  if (quote.status !== "sent") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Link unavailable</h1>
          <p className="mt-3 text-base text-slate-400">
            This link is no longer valid.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            Quote Confirmation
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">{projectName}</h1>
          <p className="mt-2 text-base text-slate-400">
            From {quote.company_name}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <SummaryField label="Customer" value={quote.customer_name || "—"} />
            <SummaryField
              label="Grand Total"
              value={formatCurrency(quote.grand_total)}
              highlight
            />
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Materials
            </h2>
            <div className="mt-3 space-y-3">
              {materials.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-base text-white">{item.item || "Item"}</p>
                    <p className="text-sm text-slate-400">
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                  <p className="shrink-0 text-base font-medium text-white">
                    {formatCurrency(materialLineTotal(item))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className={`${touchBtnPrimary} mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isConfirming ? "Confirming..." : "Confirm & Accept Quote"}
          </button>
        </div>
      </div>
    </main>
  );
}

function SummaryField({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${
          highlight ? "text-accent" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
