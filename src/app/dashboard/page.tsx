import Link from "next/link";
import { IconMicrophone } from "@/components/dashboard/icons";
import { createClient } from "@/lib/supabase/server";
import { getFirstName } from "@/lib/user";

const stats = [
  { label: "Quotes This Month", value: "0" },
  { label: "Accepted", value: "0" },
  { label: "Pending", value: "0" },
  { label: "Revenue", value: "$0" },
];

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user ? getFirstName(user) : "there";

  return (
    <main className="min-w-0 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Good morning, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Here&apos;s what&apos;s happening with your quotes today.
          </p>
        </div>

        <Link
          href="/dashboard/new-quote"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
        >
          <IconMicrophone className="h-5 w-5" />
          New Quote
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/5 p-5"
          >
            <p className="text-sm font-medium text-slate-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Quotes */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">Recent Quotes</h2>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
            <IconMicrophone className="h-7 w-7 text-accent" />
          </div>
          <p className="mt-4 text-sm text-slate-400">
            No quotes yet. Create your first quote.
          </p>
          <Link
            href="/dashboard/new-quote"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            <IconMicrophone className="h-4 w-4" />
            New Quote
          </Link>
        </div>
      </section>
    </main>
  );
}
