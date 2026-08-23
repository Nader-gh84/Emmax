import Link from "next/link";
import {
  IconLocation,
  IconMail,
  IconPhone,
  IconSparkle,
} from "@/components/dashboard/workspace-icons";
import type { DashboardCustomerPreview } from "@/lib/dashboard-metrics";

function statusClass(status: "Active" | "Inactive") {
  return status === "Active"
    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
    : "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30";
}

export function WorkspaceCustomersPanel({
  customers,
}: {
  customers: DashboardCustomerPreview[];
}) {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-white/10 bg-[#14263D] xl:flex">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">Customers</h2>
          <IconSparkle className="h-4 w-4 text-cyan-400" />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 text-center">
            <p className="text-sm font-medium text-white">No customers yet</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Add your first customer to see them here. Stats on this page stay
              at zero until you create real records.
            </p>
            <Link
              href="/dashboard/customers"
              className="mt-4 inline-flex text-sm font-semibold text-accent transition hover:text-blue-400"
            >
              Go to Customers →
            </Link>
          </div>
        ) : (
          customers.map((customer) => (
            <Link
              key={customer.id}
              href={customer.href}
              className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
                  {customer.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">
                      {customer.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(
                        customer.status
                      )}`}
                    >
                      {customer.status}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
                    {customer.email ? (
                      <li className="flex items-center gap-2 truncate">
                        <IconMail className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                        <span className="truncate">{customer.email}</span>
                      </li>
                    ) : null}
                    {customer.phone ? (
                      <li className="flex items-center gap-2 truncate">
                        <IconPhone className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                        <span className="truncate">{customer.phone}</span>
                      </li>
                    ) : null}
                    {customer.location ? (
                      <li className="flex items-center gap-2 truncate">
                        <IconLocation className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                        <span className="truncate">{customer.location}</span>
                      </li>
                    ) : null}
                  </ul>

                  {customer.projectLabel ? (
                    <p className="mt-3 truncate rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300">
                      {customer.projectLabel}
                    </p>
                  ) : (
                    <p className="mt-3 truncate rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-500">
                      No projects yet
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <Link
          href="/dashboard/customers"
          className="text-sm font-semibold text-accent transition hover:text-blue-400"
        >
          View all customers →
        </Link>
      </div>
    </aside>
  );
}
