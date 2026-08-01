import type { Metadata } from "next";
import Link from "next/link";
import { CustomerDetailsPage } from "@/components/customers/customer-details-page";
import { buildMockCustomerDetails } from "@/lib/customer-details-mock";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDisplayName, type Customer } from "@/types/customer";
import {
  isPlaceholderProjectName,
  isProjectStatus,
  resolveProjectDisplayName,
  type Project,
} from "@/types/project";

export const metadata: Metadata = {
  title: "Customer Details",
};

type ProjectRow = Project & {
  quotes?: {
    project_name?: string | null;
    quote_number?: string | null;
  } | null;
};

export default async function CustomerDetailsRoute({
  params,
}: {
  params: { id: string };
}) {
  const customerId = params.id?.trim() ?? "";
  const supabase = createClient();

  let customerRow: Customer | null = null;

  if (customerId) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .maybeSingle();
    customerRow = (data as Customer | null) ?? null;
  }

  if (!customerRow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Customer not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This customer may have been deleted, or the link is invalid.
        </p>
        <Link
          href="/dashboard/customers"
          className="mt-6 text-sm font-semibold text-accent hover:text-blue-400"
        >
          Back to Customers
        </Link>
      </div>
    );
  }

  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .select("*, quotes(project_name, quote_number)")
    .eq("customer_id", customerRow.id)
    .order("start_date", { ascending: false });

  if (projectsError) {
    console.error(
      "[CustomerDetails] projects query failed (run migration 018/019?):",
      projectsError.message
    );
  }

  const rawRows = (projectRows as ProjectRow[] | null) ?? [];

  // Backfill placeholder project names from the linked quote when available.
  for (const row of rawRows) {
    const displayName = resolveProjectDisplayName(row.project_name, row.quotes);
    if (
      !row.id ||
      !isPlaceholderProjectName(row.project_name) ||
      isPlaceholderProjectName(displayName)
    ) {
      continue;
    }

    const { error: healError } = await supabase
      .from("projects")
      .update({
        project_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (healError) {
      console.error(
        "[CustomerDetails] failed to backfill project_name:",
        healError.message
      );
    } else {
      row.project_name = displayName;
    }
  }

  const projects: Project[] = rawRows.map((row) => {
    const { quotes, ...project } = row;
    return {
      ...project,
      project_name: resolveProjectDisplayName(row.project_name, quotes),
      status: isProjectStatus(row.status) ? row.status : "active",
      value: Number(row.value) || 0,
    };
  });

  const details = buildMockCustomerDetails({
    id: customerRow.id,
    firstName: customerRow.first_name,
    lastName: customerRow.last_name,
    email: customerRow.email,
    phone: customerRow.phone,
    address: customerRow.address,
    notes: customerRow.notes,
    createdAt: customerRow.created_at,
  });

  details.fullName = getCustomerDisplayName(customerRow);
  details.counts.projects = projects.length;

  return (
    <CustomerDetailsPage
      customer={details}
      projects={projects}
      addressPlaceholder={customerRow.address}
    />
  );
}
