"use client";

import { touchBtnSecondary } from "@/components/quotes/ui";
import type { MaterialSummaryView } from "@/lib/notification-detail";
import { formatAvailabilityLabel } from "@/types/material-order";
import {
  type AppNotification,
  formatNotificationTime,
} from "@/types/notification";

function statusClasses(status: MaterialSummaryView["status"]): string {
  switch (status) {
    case "confirmed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "preparing_pricing":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
    case "awaiting_pricing":
    case "sent":
    default:
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
}

export function MaterialOrderSummaryModal({
  notification,
  summary,
  isLoading = false,
  onClose,
}: {
  notification: AppNotification;
  summary: MaterialSummaryView | null;
  isLoading?: boolean;
  onClose: () => void;
}) {
  const title =
    notification.type === "materials_confirmed"
      ? "Materials Confirmed"
      : "Material Order";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {title}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {summary?.projectName || "Materials list"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {formatNotificationTime(notification.created_at)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {notification.message}
        </p>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-sm text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
              Loading material order…
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${statusClasses(
                    summary.status
                  )}`}
                >
                  {summary.statusLabel}
                </span>
              </div>

              <dl className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Supplier
                  </dt>
                  <dd className="text-sm text-slate-200 sm:text-right">
                    {summary.supplierName}
                    {summary.supplierEmail ? (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {summary.supplierEmail}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Project
                  </dt>
                  <dd className="text-sm text-slate-200 sm:text-right">
                    {summary.projectName}
                  </dd>
                </div>

                {(summary.status === "confirmed" ||
                  summary.availabilityDate ||
                  summary.availabilityTime ||
                  summary.branchLocation) && (
                  <>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Availability
                      </dt>
                      <dd className="text-sm font-medium text-emerald-200 sm:text-right">
                        {formatAvailabilityLabel(
                          summary.availabilityDate,
                          summary.availabilityTime
                        )}
                      </dd>
                    </div>
                    {summary.branchLocation ? (
                      <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Branch / Pickup
                        </dt>
                        <dd className="text-sm text-slate-200 sm:text-right">
                          {summary.branchLocation}
                        </dd>
                      </div>
                    ) : null}
                  </>
                )}
              </dl>

              <div className="rounded-xl border border-white/10 bg-white/[0.03]">
                <div className="border-b border-white/10 px-4 py-3">
                  <h3 className="text-sm font-semibold text-white">
                    Materials
                    {summary.materials.length > 0
                      ? ` (${summary.materials.length})`
                      : ""}
                  </h3>
                </div>
                {summary.materials.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-slate-400">
                    No materials listed on this notification.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {summary.materials.map((item, index) => (
                      <li
                        key={item.id || `${item.name}-${index}`}
                        className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <span className="min-w-0 text-slate-200">
                          {item.name}
                          {item.brand ? (
                            <span className="text-slate-500">
                              {" "}
                              · {item.brand}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-medium text-white">
                          {item.quantity} {item.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-slate-400">
              Could not load material order details for this notification.
            </div>
          )}
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
