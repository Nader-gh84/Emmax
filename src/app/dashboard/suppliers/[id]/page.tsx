import type { Metadata } from "next";
import Link from "next/link";
import { SupplierDetailsPage } from "@/components/suppliers/supplier-details-page";
import { buildSupplierDetailsViewModel } from "@/lib/supplier-details-mock";
import { ensureSupplierInvoiceForOrder } from "@/lib/supplier-invoice";
import type {
  SupplierInvoiceRow,
  SupplierPaymentAllocationRow,
  SupplierPaymentRow,
} from "@/lib/supplier-accounting";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDisplayName } from "@/types/customer";
import type { Supplier } from "@/types/supplier";

export const metadata: Metadata = {
  title: "Supplier Details",
};

type InvoiceQueryRow = SupplierInvoiceRow & {
  projects?: {
    project_name?: string | null;
    customer_id?: string | null;
    customers?: {
      first_name?: string | null;
      last_name?: string | null;
    } | null;
  } | null;
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

  // Backfill invoices for confirmed material orders missing a supplier_invoice.
  const { data: confirmedOrders, error: ordersError } = await supabase
    .from("material_orders")
    .select("id")
    .eq("supplier_id", supplierRow.id)
    .eq("status", "confirmed");

  if (ordersError) {
    console.error(
      "[SupplierDetails] material_orders query failed:",
      ordersError.message
    );
  }

  const { data: existingInvoiceLinks } = await supabase
    .from("supplier_invoices")
    .select("material_order_id")
    .eq("supplier_id", supplierRow.id)
    .not("material_order_id", "is", null);

  const linkedOrderIds = new Set(
    ((existingInvoiceLinks as { material_order_id: string | null }[] | null) ??
      [])
      .map((row) => row.material_order_id)
      .filter((id): id is string => Boolean(id))
  );

  const missingOrders = (
    (confirmedOrders as { id: string }[] | null) ?? []
  ).filter((order) => !linkedOrderIds.has(order.id));

  for (const order of missingOrders) {
    await ensureSupplierInvoiceForOrder(supabase, order.id);
  }

  const [
    { data: invoiceData, error: invoicesError },
    { data: paymentData, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from("supplier_invoices")
      .select(
        "*, projects(project_name, customer_id, customers(first_name, last_name))"
      )
      .eq("supplier_id", supplierRow.id)
      .order("invoice_date", { ascending: false }),
    supabase
      .from("supplier_payments")
      .select("*")
      .eq("supplier_id", supplierRow.id)
      .order("payment_date", { ascending: false }),
  ]);

  if (invoicesError) {
    console.error(
      "[SupplierDetails] supplier_invoices query failed (run migration 036?):",
      invoicesError.message
    );
  }
  if (paymentsError) {
    console.error(
      "[SupplierDetails] supplier_payments query failed (run migration 036?):",
      paymentsError.message
    );
  }

  const invoiceRows = (invoiceData as InvoiceQueryRow[] | null) ?? [];
  const paymentRows = ((paymentData as SupplierPaymentRow[] | null) ?? []).map(
    (row) => ({ ...row, amount: Number(row.amount) || 0 })
  );

  const invoiceIds = invoiceRows.map((row) => row.id);
  let allocationRows: SupplierPaymentAllocationRow[] = [];
  if (invoiceIds.length > 0) {
    const { data: allocationData, error: allocationsError } = await supabase
      .from("supplier_payment_allocations")
      .select("*")
      .in("invoice_id", invoiceIds);

    if (allocationsError) {
      console.error(
        "[SupplierDetails] supplier_payment_allocations query failed:",
        allocationsError.message
      );
    }
    allocationRows = (
      (allocationData as SupplierPaymentAllocationRow[] | null) ?? []
    ).map((row) => ({
      ...row,
      amount_applied: Number(row.amount_applied) || 0,
    }));
  }

  const projectNames: Record<string, string> = {};
  const customerNames: Record<string, string> = {};
  for (const row of invoiceRows) {
    if (!row.project_id) continue;
    const name = row.projects?.project_name?.trim();
    projectNames[row.project_id] = name || "Untitled project";
    const customer = row.projects?.customers;
    if (customer) {
      customerNames[row.project_id] = getCustomerDisplayName({
        first_name: customer.first_name ?? "",
        last_name: customer.last_name ?? "",
      });
    }
  }

  const invoices: SupplierInvoiceRow[] = invoiceRows.map((row) => {
    const { projects: _projects, ...invoice } = row;
    return {
      ...invoice,
      amount: Number(invoice.amount) || 0,
      status:
        invoice.status === "confirmed" ? "confirmed" : "pending_confirmation",
    };
  });

  const details = buildSupplierDetailsViewModel({
    supplier: {
      ...supplierRow,
      credit_limit:
        supplierRow.credit_limit != null
          ? Number(supplierRow.credit_limit)
          : null,
      minimum_monthly_payment:
        supplierRow.minimum_monthly_payment != null
          ? Number(supplierRow.minimum_monthly_payment)
          : null,
    },
    invoices,
    payments: paymentRows,
    allocations: allocationRows,
    projectNames,
    customerNames,
  });

  return <SupplierDetailsPage supplier={details} />;
}
