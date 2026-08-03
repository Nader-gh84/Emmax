"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/profile/searchable-select";
import { touchBtnPrimary, touchInput } from "@/components/quotes/ui";
import type { PublicMaterialOrder } from "@/types/material-order";
import { formatAvailabilityLabel } from "@/types/material-order";

type View = "form" | "confirmed" | "error";

const BRANCH_OPTIONS = [
  "Main Counter / Will Call",
  "North Vancouver Branch",
  "Burnaby Branch",
  "Surrey Branch",
  "Delivery Staging Area",
  "Other (see notes with contractor)",
];

const TIME_SLOT_OPTIONS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
] as const;

const BRANCH_SELECT_OPTIONS: SearchableSelectOption[] = BRANCH_OPTIONS.map(
  (option) => ({ value: option, label: option })
);

const TIME_SELECT_OPTIONS: SearchableSelectOption[] = TIME_SLOT_OPTIONS.map(
  (slot) => ({ value: slot, label: slot })
);

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function OrderConfirmClient({
  token,
  initialOrder,
  initialError,
}: {
  token: string;
  initialOrder: PublicMaterialOrder | null;
  initialError: string | null;
}) {
  const [order, setOrder] = useState<PublicMaterialOrder | null>(initialOrder);
  const [pageError, setPageError] = useState<string | null>(initialError);
  const [view, setView] = useState<View>(() => {
    if (initialError) return "error";
    if (initialOrder?.status === "confirmed") return "confirmed";
    return "form";
  });
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityTime, setAvailabilityTime] = useState<string>(
    TIME_SLOT_OPTIONS[1]
  );
  const [branchLocation, setBranchLocation] = useState(BRANCH_OPTIONS[0]);
  const minAvailabilityDate = useMemo(() => todayIsoDate(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);

  useEffect(() => {
    if (initialOrder || initialError) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/material-orders/confirm?token=${encodeURIComponent(token)}`
        );
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (!response.ok) {
          setPageError(data.error || "Order not found.");
          setView("error");
          return;
        }

        setOrder(data.order as PublicMaterialOrder);
        if ((data.order as PublicMaterialOrder).status === "confirmed") {
          setView("confirmed");
        }
      } catch {
        if (!cancelled) {
          setPageError("Failed to load order.");
          setView("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialError, initialOrder, token]);

  const materials = useMemo(() => order?.materials ?? [], [order]);

  async function handleConfirm() {
    setFormError(null);
    if (!availabilityDate || !availabilityTime || !branchLocation.trim()) {
      setFormError("Please fill in date, time, and branch/pickup location.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/material-orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          availabilityDate,
          availabilityTime,
          branchLocation: branchLocation.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFormError(data.error || "Failed to confirm availability.");
        return;
      }

      setOrder((current) =>
        current
          ? {
              ...current,
              status: "confirmed",
              confirmed_at: data.confirmedAt ?? new Date().toISOString(),
              availability_date: data.availabilityDate ?? availabilityDate,
              availability_time: data.availabilityTime ?? availabilityTime,
              branch_location: data.branchLocation ?? branchLocation,
            }
          : current
      );
      setJustConfirmed(true);
      setView("confirmed");
    } catch {
      setFormError("Failed to confirm availability.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (view === "error" || (!order && pageError)) {
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

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <p className="text-slate-400">Loading order…</p>
      </main>
    );
  }

  if (view === "confirmed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy p-6">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            {justConfirmed
              ? "Thank you, confirmation received"
              : "Availability already confirmed"}
          </h1>
          <p className="mt-3 text-base text-slate-300">
            {justConfirmed
              ? "The contractor has been notified of your availability."
              : "This materials order was already confirmed."}
          </p>
          <div className="mt-6 rounded-xl border border-white/10 bg-navy/40 px-4 py-4 text-left text-sm text-slate-300">
            <p>
              <span className="text-slate-500">Ready: </span>
              {formatAvailabilityLabel(
                order.availability_date,
                order.availability_time
              )}
            </p>
            <p className="mt-2">
              <span className="text-slate-500">Location: </span>
              {order.branch_location || "—"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Materials order confirmation
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            {order.project_name || "Materials Order"}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            From {order.company_name}
            {order.customer_name ? ` · Customer: ${order.customer_name}` : ""}
          </p>

          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Materials
            </h2>
            <ul className="mt-3 space-y-2">
              {materials.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm"
                >
                  <span className="text-slate-200">
                    {item.name || "Material"}
                    {item.brand ? (
                      <span className="text-slate-500"> · {item.brand}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-medium text-white">
                    {item.quantity} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {order.notes ? (
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Order notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                {order.notes}
              </p>
            </div>
          ) : null}

          <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
            <h2 className="text-lg font-semibold text-white">
              Confirm availability
            </h2>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Availability Date
              </span>
              <input
                type="date"
                value={availabilityDate}
                min={minAvailabilityDate}
                onChange={(event) => setAvailabilityDate(event.target.value)}
                onKeyDown={(event) => {
                  // Calendar picker only — block typed digits/letters.
                  const allowed = [
                    "Tab",
                    "Escape",
                    "Enter",
                    "ArrowUp",
                    "ArrowDown",
                    "ArrowLeft",
                    "ArrowRight",
                    "Home",
                    "End",
                    "Backspace",
                    "Delete",
                  ];
                  if (!allowed.includes(event.key)) {
                    event.preventDefault();
                  }
                }}
                onClick={(event) => {
                  const input = event.currentTarget;
                  if (typeof input.showPicker === "function") {
                    try {
                      input.showPicker();
                    } catch {
                      // Some browsers throw if showPicker is blocked; ignore.
                    }
                  }
                }}
                className={`${touchInput} cursor-pointer`}
              />
            </label>
            <div>
              <label
                htmlFor="order-confirm-availability-time"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Availability Time
              </label>
              <SearchableSelect
                id="order-confirm-availability-time"
                value={availabilityTime}
                onChange={setAvailabilityTime}
                options={TIME_SELECT_OPTIONS}
                placeholder="Select time"
                disabled={isSubmitting}
                emptyQueryMaxResults={TIME_SELECT_OPTIONS.length}
              />
            </div>
            <div>
              <label
                htmlFor="order-confirm-branch-location"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Branch / Pickup Location
              </label>
              <SearchableSelect
                id="order-confirm-branch-location"
                value={branchLocation}
                onChange={setBranchLocation}
                options={BRANCH_SELECT_OPTIONS}
                placeholder="Select branch"
                disabled={isSubmitting}
                emptyQueryMaxResults={BRANCH_SELECT_OPTIONS.length}
              />
            </div>

            {formError ? (
              <p className="text-sm text-red-300">{formError}</p>
            ) : null}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleConfirm()}
              className={`${touchBtnPrimary} w-full`}
            >
              {isSubmitting ? "Confirming…" : "Confirm Availability"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
