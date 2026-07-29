"use client";

import { useState } from "react";
import { touchBtnPrimary } from "@/components/quotes/ui";
import type { SupplierAckSummary } from "@/lib/supplier-ack";

type ViewState = "pending" | "success" | "already" | "error";

export function SupplierAckClient({
  token,
  initialSummary,
  initialError,
}: {
  token: string;
  initialSummary: SupplierAckSummary | null;
  initialError: string | null;
}) {
  const [summary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState<ViewState>(() => {
    if (initialError && !initialSummary) return "error";
    if (initialSummary?.acknowledgedAt) return "already";
    if (!initialSummary) return "error";
    return "pending";
  });

  async function handleAcknowledge() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/supplier-ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to acknowledge request");
      }

      setView(data.alreadyAcknowledged ? "already" : "success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to acknowledge request"
      );
      // Keep pending UI so the supplier can retry; show inline error.
      setView("pending");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (view === "error" || !summary) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-white">Link unavailable</h1>
        <p className="mt-3 text-base text-slate-400">
          {error || "This acknowledgment link is no longer valid."}
        </p>
      </Shell>
    );
  }

  if (view === "already") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-white">
          This has already been acknowledged
        </h1>
        <p className="mt-3 text-base text-slate-300">
          {summary.companyName} was already notified that you received the
          materials list.
        </p>
      </Shell>
    );
  }

  if (view === "success") {
    return (
      <Shell accent="success">
        <h1 className="text-2xl font-bold text-white">
          Thanks! The contractor has been notified.
        </h1>
        <p className="mt-3 text-base text-slate-300">
          {summary.companyName} will see that you received the materials list
          and are preparing pricing.
        </p>
      </Shell>
    );
  }

  const projectLabel = summary.projectName?.trim() || "Materials list";

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy p-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">
          Supplier acknowledgment
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">{projectLabel}</h1>
        <p className="mt-2 text-base text-slate-400">
          From {summary.companyName}
        </p>
        <p className="mt-6 text-base leading-relaxed text-slate-300">
          Confirm that you received the materials list and that pricing is
          coming soon. This notifies the contractor in their Inbox.
        </p>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleAcknowledge}
          disabled={isSubmitting}
          className={`${touchBtnPrimary} mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isSubmitting
            ? "Sending…"
            : "I received this — pricing coming soon"}
        </button>
      </div>
    </main>
  );
}

function Shell({
  children,
  accent = "neutral",
}: {
  children: React.ReactNode;
  accent?: "neutral" | "success";
}) {
  const border =
    accent === "success"
      ? "border-green-500/30 bg-green-500/10"
      : "border-white/10 bg-white/[0.03]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy p-6">
      <div className={`w-full max-w-lg rounded-2xl border p-8 text-center ${border}`}>
        {children}
      </div>
    </main>
  );
}
