"use client";

import Link from "next/link";
import type { MaterialOrder } from "@/types/material-order";
import type { StoredMaterial } from "@/types/quote";
import { formatProjectDetailMoney } from "@/lib/project-detail-mock";

function pricesBadge(materialOrder: MaterialOrder | null): {
  label: string;
  className: string;
} {
  if (!materialOrder) {
    return {
      label: "No Pricing",
      className: "bg-white/5 text-slate-400 ring-white/10",
    };
  }
  if (
    materialOrder.status === "confirmed" ||
    Boolean(materialOrder.materials_received_at)
  ) {
    return {
      label: "Prices Received",
      className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    };
  }
  const hasPrices = materialOrder.materials.some(
    (line) => Number(line.unitPrice) > 0
  );
  if (hasPrices) {
    return {
      label: "Prices Received",
      className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    };
  }
  return {
    label: "Awaiting Prices",
    className: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  };
}

export function MaterialsPricingCard({
  customerId,
  projectId,
  materialOrder,
  projectMaterials,
  taxRate = 0.05,
  readOnly = false,
}: {
  customerId: string;
  projectId: string;
  materialOrder: MaterialOrder | null;
  projectMaterials: StoredMaterial[];
  taxRate?: number;
  readOnly?: boolean;
}) {
  const defaultSupplier = materialOrder?.supplier_name?.trim() || "";
  const lines =
    materialOrder?.materials?.length
      ? materialOrder.materials.map((line) => ({
          name: line.name,
          brand: line.brand || "",
          supplier: (line.supplier || "").trim() || defaultSupplier || "—",
          quantity: Number(line.quantity) || 0,
          unit: line.unit || "ea",
          unitPrice: Number(line.unitPrice) || 0,
        }))
      : projectMaterials.map((row) => ({
          name: row.item,
          brand: row.brand || "",
          supplier: defaultSupplier || "—",
          quantity: Number(row.quantity) || 0,
          unit: row.unit || "ea",
          unitPrice: Number(row.unitPrice) || 0,
        }));

  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const orderHref = `/dashboard/customers/${customerId}/projects/${projectId}/order-materials`;
  const badge = pricesBadge(materialOrder);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Materials & Supplier Pricing
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {materialOrder
              ? `Order ${materialOrder.status}${
                  materialOrder.supplier_name
                    ? ` · ${materialOrder.supplier_name}`
                    : ""
                }`
              : "From project / quote materials"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={orderHref}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            {readOnly
              ? "View Order"
              : materialOrder
                ? "View / Edit Order"
                : "Order Materials"}
          </Link>
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No materials on this project yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3 font-semibold">Item</th>
                <th className="pb-2 pr-3 font-semibold">Brand</th>
                <th className="pb-2 pr-3 font-semibold">Supplier</th>
                <th className="pb-2 pr-3 font-semibold text-right">Qty</th>
                <th className="pb-2 pr-3 font-semibold text-right">Unit $</th>
                <th className="pb-2 font-semibold text-right">Line</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.name}-${index}`} className="border-b border-white/5">
                  <td className="py-2.5 pr-3 text-slate-200">{line.name}</td>
                  <td className="py-2.5 pr-3 text-slate-400">{line.brand || "—"}</td>
                  <td className="py-2.5 pr-3 text-slate-300">{line.supplier}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-300">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-slate-300">
                    {formatProjectDetailMoney(line.unitPrice)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-white">
                    {formatProjectDetailMoney(line.quantity * line.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dl className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm">
        <div className="flex justify-between text-slate-400">
          <dt>Subtotal</dt>
          <dd>{formatProjectDetailMoney(subtotal)}</dd>
        </div>
        <div className="flex justify-between text-slate-400">
          <dt>GST / Tax ({Math.round(taxRate * 100)}%)</dt>
          <dd>{formatProjectDetailMoney(tax)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold text-white">
          <dt>Total</dt>
          <dd>{formatProjectDetailMoney(total)}</dd>
        </div>
      </dl>
    </section>
  );
}
