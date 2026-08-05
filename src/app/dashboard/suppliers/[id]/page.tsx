import type { Metadata } from "next";
import Link from "next/link";
import { SupplierDetailsPage } from "@/components/suppliers/supplier-details-page";
import { buildMockSupplierDetails } from "@/lib/supplier-details-mock";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "@/types/supplier";

export const metadata: Metadata = {
  title: "Supplier Details",
};

export default async function SupplierDetailsRoute({
  params,
}: {
  params: { id: string };
}) {
  const supplierId = params.id?.trim() ?? "";
  const supabase = createClient();

  let supplierRow: Supplier | null = null;

  if (supplierId) {
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .eq("id", supplierId)
      .maybeSingle();
    supplierRow = (data as Supplier | null) ?? null;
  }

  if (!supplierRow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-white">Supplier not found</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          This supplier may have been deleted, or the link is invalid.
        </p>
        <Link
          href="/dashboard/suppliers"
          className="mt-6 text-sm font-semibold text-accent hover:text-blue-400"
        >
          Back to Suppliers
        </Link>
      </div>
    );
  }

  const details = buildMockSupplierDetails({
    id: supplierRow.id,
    name: supplierRow.supplier_name,
    email: supplierRow.email,
    phone: supplierRow.phone,
    address: supplierRow.location,
    contactPerson: supplierRow.contact_person,
  });

  return <SupplierDetailsPage supplier={details} />;
}
