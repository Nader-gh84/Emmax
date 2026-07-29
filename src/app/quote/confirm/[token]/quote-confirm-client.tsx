"use client";

import { useEffect, useState } from "react";
import {
  formatCurrency,
  formatQuoteDate,
  materialLineTotal,
  storedToMaterials,
} from "@/types/quote";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchTextarea,
} from "@/components/quotes/ui";
import type { PublicQuoteSummary } from "@/lib/quote-confirmation";

type ViewMode = "review" | "declineForm" | "accepted" | "declined";

export function QuoteConfirmClient({
  token,
  initialQuote = null,
  initialError = null,
}: {
  token: string;
  initialQuote?: PublicQuoteSummary | null;
  initialError?: string | null;
}) {
  const [quote, setQuote] = useState<PublicQuoteSummary | null>(initialQuote);
  const [isLoading, setIsLoading] = useState(!initialQuote && !initialError);
  const [pageError, setPageError] = useState<string | null>(initialError);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [confirmedAt, setConfirmedAt] = useState<string | null>(
    initialQuote?.confirmed_at ?? null
  );
  const [view, setView] = useState<ViewMode>(() => {
    if (initialQuote?.status === "accepted") return "accepted";
    if (initialQuote?.status === "declined") return "declined";
    return "review";
  });
  const [justAccepted, setJustAccepted] = useState(false);
  const [justDeclined, setJustDeclined] = useState(false);

  useEffect(() => {
    if (initialQuote || initialError) {
      return;
    }

    async function loadQuote() {
      setIsLoading(true);
      setPageError(null);

      try {
        const response = await fetch(
          `/api/quotes/confirm?token=${encodeURIComponent(token)}`
        );
        const data = await response.json();

        if (!response.ok) {
          console.error("[QuoteConfirmClient] Quote fetch failed:", {
            token,
            status: response.status,
            data,
          });
          setQuote(null);
          setPageError(data.error || "This link is no longer valid.");
          return;
        }

        setQuote(data.quote);
        if (data.quote.status === "accepted") {
          setConfirmedAt(data.quote.confirmed_at);
          setView("accepted");
        } else if (data.quote.status === "declined") {
          setView("declined");
        } else {
          setView("review");
        }
      } catch (fetchError) {
        console.error("[QuoteConfirmClient] Quote fetch error:", fetchError);
        setPageError("This link is no longer valid.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadQuote();
  }, [token, initialQuote, initialError]);

  async function handleConfirm() {
    setIsConfirming(true);
    setActionError(null);

    try {
      const response = await fetch("/api/quotes/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error("[QuoteConfirmClient] Confirm failed:", {
          token,
          status: response.status,
          data,
        });
        throw new Error(data.error || "Failed to confirm quote");
      }

      setConfirmedAt(data.confirmedAt ?? new Date().toISOString());
      setJustAccepted(true);
      setView("accepted");
      if (quote) {
        setQuote({ ...quote, status: "accepted" });
      }
    } catch (err) {
      console.error("[QuoteConfirmClient] Confirm error:", err);
      setActionError(
        err instanceof Error ? err.message : "Failed to confirm quote"
      );
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleDecline() {
    setIsDeclining(true);
    setActionError(null);

    try {
      const response = await fetch("/api/quotes/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reason: declineReason.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        console.error("[QuoteConfirmClient] Decline failed:", {
          token,
          status: response.status,
          data,
        });
        throw new Error(data.error || "Failed to decline quote");
      }

      setJustDeclined(!data.alreadyDeclined);
      setView("declined");
      if (quote) {
        setQuote({ ...quote, status: "declined" });
      }
    } catch (err) {
      console.error("[QuoteConfirmClient] Decline error:", err);
      setActionError(
        err instanceof Error ? err.message : "Failed to decline quote"
      );
    } finally {
      setIsDeclining(false);
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

  if (!quote || pageError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-2xl font-bold text-white">Link unavailable</h1>
          <p className="mt-3 text-base text-slate-400">
            {pageError || "This link is no longer valid."}
          </p>
        </div>
      </main>
    );
  }

  const materials = storedToMaterials(quote.materials);
  const projectName = quote.project_name?.trim() || "Your Project";

  if (view === "accepted") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="w-full max-w-lg rounded-2xl border border-green-500/30 bg-green-500/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            {justAccepted
              ? "Thanks! The contractor has been notified."
              : "Quote already confirmed"}
          </h1>
          <p className="mt-3 text-base text-slate-300">
            {justAccepted
              ? "Your confirmation is complete."
              : confirmedAt
                ? `You already confirmed this quote on ${formatQuoteDate(confirmedAt)}.`
                : "This quote has already been accepted."}
          </p>
        </div>
      </main>
    );
  }

  if (view === "declined") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            {justDeclined
              ? "Thanks for letting us know."
              : "Quote already declined"}
          </h1>
          <p className="mt-3 text-base text-slate-300">
            {justDeclined
              ? "The contractor has been notified of your decision."
              : "This quote was already marked as declined."}
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

  if (view === "declineForm") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            Decline quote
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">{projectName}</h1>
          <p className="mt-2 text-base text-slate-400">
            Optional — tell {quote.company_name} why this quote doesn&apos;t
            work.
          </p>

          <label
            htmlFor="decline-reason"
            className="mb-2 mt-6 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Reason (optional)
          </label>
          <textarea
            id="decline-reason"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            rows={4}
            placeholder='e.g. "Price too high", "Wrong materials", "Found another contractor", "Timeline does not work"'
            className={touchTextarea}
          />

          {actionError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {actionError}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setView("review");
              }}
              disabled={isDeclining}
              className={`${touchBtnSecondary} flex-1`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={isDeclining}
              className={`${touchBtnPrimary} flex-1 bg-red-600 hover:bg-red-500`}
            >
              {isDeclining ? "Sending…" : "Submit decline"}
            </button>
          </div>
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

          {actionError ? (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {actionError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || isDeclining}
            className={`${touchBtnPrimary} mt-8 w-full`}
          >
            {isConfirming ? "Confirming..." : "Confirm & Accept Quote"}
          </button>

          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setView("declineForm");
            }}
            disabled={isConfirming || isDeclining}
            className="mt-4 w-full text-center text-sm font-medium text-slate-400 underline-offset-2 transition hover:text-red-300 hover:underline disabled:opacity-60"
          >
            Can&apos;t accept this quote? Decline instead
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
