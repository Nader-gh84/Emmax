import type { Metadata } from "next";
import Link from "next/link";
import { CustomerDetailsPage } from "@/components/customers/customer-details-page";
import { buildMockCustomerDetails } from "@/lib/customer-details-mock";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDisplayName, type Customer } from "@/types/customer";

export const metadata: Metadata = {
  title: "Customer Details",
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

  // Prefer the real display name from DB fields.
  details.fullName = getCustomerDisplayName(customerRow);

  return <CustomerDetailsPage customer={details} />;
}
