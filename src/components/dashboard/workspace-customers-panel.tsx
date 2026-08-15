import Link from "next/link";
import {
  IconLocation,
  IconMail,
  IconMore,
  IconPhone,
  IconSearch,
  IconSparkle,
} from "@/components/dashboard/workspace-icons";

const PLACEHOLDER_CUSTOMERS = [
  {
    id: "1",
    name: "Sarah Mitchell",
    title: "Project Manager · Apex Build",
    email: "sarah@apexbuild.com",
    phone: "+1 (416) 555-0142",
    location: "Toronto, ON",
    project: "Kitchen Reno — Phase 2",
    status: "Active" as const,
    initials: "SM",
  },
  {
    id: "2",
    name: "James Chen",
    title: "Owner · Chen Electric",
    email: "james@chenelectric.ca",
    phone: "+1 (604) 555-0198",
    location: "Vancouver, BC",
    project: "Panel Upgrade Quote",
    status: "Pending" as const,
    initials: "JC",
  },
  {
    id: "3",
    name: "Emily Torres",
    title: "Facilities · Northwind HQ",
    email: "e.torres@northwind.io",
    phone: "+1 (403) 555-0110",
    location: "Calgary, AB",
    project: "HVAC Maintenance",
    status: "Active" as const,
    initials: "ET",
  },
  {
    id: "4",
    name: "Michael Brooks",
    title: "GC · Brooks & Sons",
    email: "mike@brooksconstruct.com",
    phone: "+1 (514) 555-0166",
    location: "Montreal, QC",
    project: "Office Fit-out",
    status: "Pending" as const,
    initials: "MB",
  },
];

function statusClass(status: "Active" | "Pending") {
  return status === "Active"
    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
    : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30";
}

export function WorkspaceCustomersPanel() {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-l border-white/10 bg-[#14263D] xl:flex">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-white">Customers</h2>
          <IconSparkle className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Search customers"
          >
            <IconSearch className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-white"
            aria-label="More options"
          >
            <IconMore className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {PLACEHOLDER_CUSTOMERS.map((customer) => (
          <article
            key={customer.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05]"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
                {customer.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {customer.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {customer.title}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(
                      customer.status
                    )}`}
                  >
                    {customer.status}
                  </span>
                </div>

                <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2 truncate">
                    <IconMail className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                    <span className="truncate">{customer.email}</span>
                  </li>
                  <li className="flex items-center gap-2 truncate">
                    <IconPhone className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                    <span className="truncate">{customer.phone}</span>
                  </li>
                  <li className="flex items-center gap-2 truncate">
                    <IconLocation className="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
                    <span className="truncate">{customer.location}</span>
                  </li>
                </ul>

                <p className="mt-3 truncate rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300">
                  {customer.project}
                </p>
              </div>
            </div>
          </article>
        ))}
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
