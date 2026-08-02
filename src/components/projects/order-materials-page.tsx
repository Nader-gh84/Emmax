"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  IconCalendar,
  IconCheckCircle,
  IconMicrophone,
} from "@/components/dashboard/icons";
import {
  IconLocation,
  IconPhone,
  IconSend,
} from "@/components/dashboard/workspace-icons";
import { touchInput, touchTextarea } from "@/components/quotes/ui";
import {
  formatOrderMoney,
  type OrderMaterialRow,
  type OrderMaterialsMock,
} from "@/lib/order-materials-mock";
import { formatProjectDetailMoney } from "@/lib/project-detail-mock";
import {
  formatAvailabilityLabel,
  getMaterialsTrackerActiveStep,
  type MaterialOrder,
} from "@/types/material-order";

const NOTES_MAX = 250;

function noop(label: string) {
  return () => {
    console.log(`[OrderMaterials] ${label}`);
  };
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function IconDollar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconCube({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a8 8 0 018 8" opacity={0.35} />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function IconCloudUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

type TrackerState = "complete" | "active" | "inactive";

function buildTrackerSteps(
  acceptedDate: string,
  existingOrder: MaterialOrder | null
): {
  id: string;
  label: string;
  state: TrackerState;
  detail: string;
}[] {
  const active = getMaterialsTrackerActiveStep(existingOrder);
  const sentDetail =
    existingOrder?.status === "sent" || existingOrder?.status === "confirmed"
      ? existingOrder.sent_at
        ? new Date(existingOrder.sent_at).toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Sent"
      : "Not Started";
  const readyDetail =
    existingOrder?.status === "confirmed"
      ? formatAvailabilityLabel(
          existingOrder.availability_date,
          existingOrder.availability_time
        )
      : "Not Started";

  const rank = {
    quote_accepted: 0,
    review_materials: 1,
    order_sent: 2,
    materials_ready: 3,
    project_start: 4,
  }[active];

  function stateFor(index: number): TrackerState {
    if (index < rank) return "complete";
    if (index === rank) return "active";
    return "inactive";
  }

  return [
    {
      id: "accepted",
      label: "Quote Accepted",
      state: "complete",
      detail: acceptedDate,
    },
    {
      id: "review",
      label: "Review Materials",
      state: stateFor(1),
      detail:
        rank === 1 ? "In Progress" : rank > 1 ? "Complete" : "Not Started",
    },
    {
      id: "sent",
      label: "Order Sent",
      state: stateFor(2),
      detail: rank === 2 ? "In Progress" : sentDetail,
    },
    {
      id: "ready",
      label: "Materials Ready",
      state: stateFor(3),
      detail: rank === 3 ? readyDetail : readyDetail,
    },
    {
      id: "start",
      label: "Project Start",
      state: "inactive",
      detail: "Not Started",
    },
  ];
}

export function OrderMaterialsPage({
  order,
  existingOrder = null,
}: {
  order: OrderMaterialsMock;
  existingOrder?: MaterialOrder | null;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [materials, setMaterials] = useState<OrderMaterialRow[]>(order.materials);
  const [notes, setNotes] = useState(order.notes);
  const [primarySupplierId, setPrimarySupplierId] = useState(
    order.primarySupplierId
  );
  const [deliveryOption, setDeliveryOption] = useState(order.deliveryOption);
  const [requiredByDate, setRequiredByDate] = useState(order.requiredByDate);
  const [projectReference, setProjectReference] = useState(
    order.projectReference
  );
  const [liveOrder, setLiveOrder] = useState<MaterialOrder | null>(existingOrder);
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const projectHref = `/dashboard/customers/${order.customerId}/projects/${order.projectId}`;
  const trackerSteps = useMemo(
    () => buildTrackerSteps(order.acceptedDate, liveOrder),
    [liveOrder, order.acceptedDate]
  );
  const orderLocked =
    liveOrder?.status === "sent" || liveOrder?.status === "confirmed";

  const subtotal = useMemo(
    () =>
      materials.reduce((sum, row) => sum + row.quantity * row.unitPrice, 0),
    [materials]
  );
  const totalQty = useMemo(
    () => materials.reduce((sum, row) => sum + row.quantity, 0),
    [materials]
  );
  const tax = subtotal * order.taxRate;
  const estimatedTotal = subtotal + tax;

  function updateQuantity(id: string, quantity: number) {
    if (orderLocked) return;
    setMaterials((rows) =>
      rows.map((row) =>
        row.id === id
          ? { ...row, quantity: Number.isFinite(quantity) ? Math.max(0, quantity) : 0 }
          : row
      )
    );
  }

  async function handleSendOrder() {
    setSendFeedback(null);

    if (!primarySupplierId) {
      setSendFeedback({
        type: "error",
        message:
          "Select a primary supplier with an email address from your Suppliers list.",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/material-orders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: order.projectId,
          customerId: order.customerId,
          supplierId: primarySupplierId,
          projectName: order.projectName,
          customerName: order.customerName,
          notes,
          requiredByDate,
          deliveryOption,
          projectReference,
          materials,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSendFeedback({
          type: "error",
          message: data.error || "Failed to send order to supplier.",
        });
        return;
      }

      const selected = order.suppliers.find((s) => s.id === primarySupplierId);
      setLiveOrder({
        id: data.orderId,
        user_id: "",
        project_id: order.projectId,
        customer_id: order.customerId,
        supplier_id: primarySupplierId,
        project_name: order.projectName,
        customer_name: order.customerName,
        supplier_name: selected?.name ?? null,
        supplier_email: selected?.email ?? null,
        materials,
        notes,
        required_by_date: requiredByDate,
        delivery_option: deliveryOption,
        project_reference: projectReference,
        status: "sent",
        confirmation_token: "",
        sent_at: data.sentAt || new Date().toISOString(),
        confirmed_at: null,
        availability_date: null,
        availability_time: null,
        branch_location: null,
        created_at: data.sentAt || new Date().toISOString(),
        updated_at: data.sentAt || new Date().toISOString(),
      });
      setSendFeedback({
        type: "success",
        message: `Order sent to ${selected?.name || "supplier"}. Progress moved to Order Sent.`,
      });
    } catch {
      setSendFeedback({
        type: "error",
        message: "Failed to send order to supplier.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="relative flex w-full flex-1 flex-col pb-36">
      {/* Header — same pattern as Project Detail */}
      <div className="border-b border-white/10 bg-[#0B1220]/80 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          <Link href="/dashboard" className="transition hover:text-accent">
            Dashboard
          </Link>
          <span className="text-slate-600">›</span>
          <Link
            href="/dashboard/customers"
            className="transition hover:text-accent"
          >
            Customers
          </Link>
          <span className="text-slate-600">›</span>
          <Link
            href={`/dashboard/customers/${order.customerId}`}
            className="transition hover:text-accent"
          >
            {order.customerName}
          </Link>
          <span className="text-slate-600">›</span>
          <Link href={projectHref} className="transition hover:text-accent">
            {order.projectName}
          </Link>
          <span className="text-slate-600">›</span>
          <span className="text-slate-300">Order Materials</span>
        </nav>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {order.projectName}
              </h1>
              <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/30">
                {order.statusLabel}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
              <MetaItem
                icon={<IconPhone className="h-3.5 w-3.5" />}
                label={order.customerName}
              />
              <MetaItem
                icon={<IconLocation className="h-3.5 w-3.5" />}
                label={order.address}
              />
              <MetaItem
                icon={<IconCalendar className="h-3.5 w-3.5" />}
                label={`Accepted ${order.acceptedDate}`}
              />
              <MetaItem
                icon={<IconDollar className="h-3.5 w-3.5" />}
                label={formatProjectDetailMoney(order.quoteAmount)}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            <button
              type="button"
              onClick={noop("Contact Customer")}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <IconChat className="h-4 w-4" />
              Contact Customer
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                aria-expanded={moreOpen}
              >
                More
                <IconChevronDown className="h-3.5 w-3.5" />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
                  {["Duplicate project", "Export summary", "Archive project"].map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          noop(item)();
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              disabled
              className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-accent/40 px-5 text-sm font-semibold text-white/80"
              title="You are already on the Order Materials step"
            >
              <IconCube className="h-4 w-4" />
              Order Materials
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* Progress tracker */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 sm:px-6">
          <ol className="grid gap-4 sm:grid-cols-5 sm:gap-0">
            {trackerSteps.map((step, index) => (
              <li key={step.id} className="relative flex sm:flex-col sm:items-center">
                {index < trackerSteps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-10 right-0 top-5 hidden border-t border-dashed border-white/20 sm:block sm:left-[calc(50%+1.25rem)] sm:right-[calc(-50%+1.25rem)]"
                  />
                ) : null}
                <div className="relative z-10 flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                  <TrackerIcon state={step.state} />
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        step.state === "complete"
                          ? "text-emerald-300"
                          : step.state === "active"
                            ? "text-accent"
                            : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`mt-0.5 text-xs ${
                        step.state === "complete"
                          ? "text-emerald-400/80"
                          : step.state === "active"
                            ? "text-accent/80"
                            : "text-slate-500"
                      }`}
                    >
                      {step.detail}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Section header */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-white">
              Step 1: Review & Finalize Materials
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
              Review the list of materials from the accepted quote. You can
              edit, add or remove items before sending the order to suppliers.
            </p>
          </div>
          <div className="inline-flex max-w-md items-start gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3.5 py-2 text-xs leading-relaxed text-cyan-100">
            <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
            After sending the order, suppliers will confirm availability and
            estimated delivery.
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-12">
          {/* Main column */}
          <div className="space-y-5 xl:col-span-8">
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3 font-medium">#</th>
                      <th className="px-3 py-3 font-medium">Material/Description</th>
                      <th className="px-3 py-3 font-medium">Part Number</th>
                      <th className="px-3 py-3 font-medium">Brand</th>
                      <th className="px-3 py-3 font-medium">Supplier</th>
                      <th className="px-3 py-3 font-medium">Qty</th>
                      <th className="px-3 py-3 font-medium">Unit</th>
                      <th className="px-3 py-3 font-medium">Unit Price</th>
                      <th className="px-3 py-3 font-medium">Total</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((row, index) => {
                      const lineTotal = row.quantity * row.unitPrice;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-white/5 text-slate-300"
                        >
                          <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                                <IconCube className="h-4 w-4" />
                              </span>
                              <span className="font-medium text-white">
                                {row.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-400">
                            {row.partNumber}
                          </td>
                          <td className="px-3 py-3">{row.brand}</td>
                          <td className="px-3 py-3">{row.supplier}</td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min={0}
                              value={row.quantity}
                              onChange={(event) =>
                                updateQuantity(
                                  row.id,
                                  Number(event.target.value)
                                )
                              }
                              disabled={orderLocked}
                              className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
                            />
                          </td>
                          <td className="px-3 py-3">{row.unit}</td>
                          <td className="px-3 py-3">
                            {formatOrderMoney(row.unitPrice)}
                          </td>
                          <td className="px-3 py-3 font-medium text-white">
                            {formatOrderMoney(lineTotal)}
                          </td>
                          <td className="px-3 py-3">
                            <span className="inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent ring-1 ring-accent/25">
                              {row.status}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={noop(`Edit ${row.name}`)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                                aria-label={`Edit ${row.name}`}
                              >
                                <IconPencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={noop(`Delete ${row.name}`)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
                                aria-label={`Delete ${row.name}`}
                              >
                                <IconTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={noop("Add New Material")}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                >
                  + Add New Material
                </button>
                <p className="text-sm text-slate-400">
                  Subtotal{" "}
                  <span className="ml-2 text-base font-bold text-white">
                    {formatOrderMoney(subtotal)}
                  </span>
                </p>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Order Notes (Optional)
                  </h3>
                  <span className="text-xs text-slate-500">
                    {notes.length}/{NOTES_MAX}
                  </span>
                </div>
                <textarea
                  value={notes}
                  maxLength={NOTES_MAX}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add delivery instructions, staging notes, or special requests for suppliers…"
                  rows={5}
                  disabled={orderLocked}
                  className={`${touchTextarea} mt-3 resize-none text-sm disabled:opacity-60`}
                />
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Attachments (Optional)
                </h3>
                <button
                  type="button"
                  onClick={noop("Upload attachment")}
                  className="mt-3 flex min-h-[148px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-6 text-center transition hover:border-accent/40 hover:bg-accent/5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <IconCloudUpload className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-white">
                    Drag & drop files here or click to upload
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    e.g. drawings, specs, additional lists
                  </p>
                </button>
              </section>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4 xl:col-span-4 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Materials Summary
              </h3>
              <dl className="mt-4 space-y-3">
                <SummaryRow label="Total Items" value={String(materials.length)} />
                <SummaryRow label="Total Quantity" value={String(totalQty)} />
                <SummaryRow
                  label="Estimated Subtotal"
                  value={formatOrderMoney(subtotal)}
                />
                <SummaryRow
                  label={`Tax (${Math.round(order.taxRate * 100)}%)`}
                  value={formatOrderMoney(tax)}
                />
                <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-accent/80">
                    Estimated Total
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-white">
                    {formatOrderMoney(estimatedTotal)}
                  </dd>
                </div>
              </dl>

              {liveOrder?.status === "confirmed" ? (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                    Supplier Availability
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {formatAvailabilityLabel(
                      liveOrder.availability_date,
                      liveOrder.availability_time
                    )}
                  </p>
                  <p className="mt-1 text-sm text-emerald-100/90">
                    {liveOrder.branch_location || "—"}
                  </p>
                  <p className="mt-1 text-xs text-emerald-200/70">
                    Confirmed by {liveOrder.supplier_name || "supplier"}
                  </p>
                </div>
              ) : liveOrder?.status === "sent" ? (
                <div className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                    Awaiting supplier confirmation
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Order sent to {liveOrder.supplier_name || "supplier"}.
                  </p>
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Supplier & Order Info
              </h3>
              <div className="mt-4 space-y-3">
                <Field label="Primary Supplier">
                  <select
                    value={primarySupplierId}
                    onChange={(event) =>
                      setPrimarySupplierId(event.target.value)
                    }
                    disabled={orderLocked}
                    className={`${touchInput} disabled:opacity-60`}
                  >
                    <option value="">Select supplier…</option>
                    {order.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                        {!supplier.email ? " (no email)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                {order.suppliers.length === 0 ? (
                  <p className="text-xs text-amber-300">
                    Add a supplier with an email under Dashboard → Suppliers
                    before sending an order.
                  </p>
                ) : null}
                <Field label="Delivery Option">
                  <select
                    value={deliveryOption}
                    onChange={(event) => setDeliveryOption(event.target.value)}
                    disabled={orderLocked}
                    className={`${touchInput} disabled:opacity-60`}
                  >
                    {order.deliveryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Required By Date">
                  <input
                    type="date"
                    value={requiredByDate}
                    onChange={(event) => setRequiredByDate(event.target.value)}
                    disabled={orderLocked}
                    className={`${touchInput} disabled:opacity-60`}
                  />
                </Field>
                <Field label="Project Reference">
                  <input
                    type="text"
                    value={projectReference}
                    onChange={(event) => setProjectReference(event.target.value)}
                    disabled={orderLocked}
                    className={`${touchInput} disabled:opacity-60`}
                  />
                </Field>
              </div>
            </section>

            <section className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 via-white/[0.03] to-cyan-500/10 p-5">
              <h3 className="text-sm font-semibold text-white">Need Help?</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Ask Ema AI to help you add materials or check availability.
              </p>
              <button
                type="button"
                onClick={noop("Ask Ema")}
                className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                <IconMicrophone className="h-4 w-4" />
                Ask Ema
              </button>
            </section>
          </aside>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-16 z-30 border-t border-white/10 bg-[#0B1220]/95 px-4 py-4 backdrop-blur sm:px-6 lg:bottom-0 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={projectHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/20 px-5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to Project
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={noop("Save as Draft")}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSending || orderLocked}
              onClick={() => void handleSendOrder()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconSend className="h-4 w-4" />
              {orderLocked
                ? liveOrder?.status === "confirmed"
                  ? "Order Confirmed"
                  : "Order Sent"
                : isSending
                  ? "Sending…"
                  : "Send Order to Suppliers"}
            </button>
          </div>
        </div>
        {sendFeedback ? (
          <p
            className={`mt-3 text-center text-xs ${
              sendFeedback.type === "success"
                ? "text-emerald-300"
                : "text-red-300"
            }`}
          >
            {sendFeedback.message}
          </p>
        ) : (
          <p className="mt-3 text-center text-xs text-slate-500">
            Suppliers will be notified and asked to confirm availability
          </p>
        )}
      </div>

      {/* Floating Ema AI */}
      <button
        type="button"
        onClick={noop("Ema AI speak")}
        className="fixed bottom-24 left-4 z-40 flex items-center gap-3 rounded-2xl border border-accent/30 bg-[#0B1220]/95 px-3.5 py-3 shadow-xl shadow-black/40 backdrop-blur transition hover:border-accent/50 hover:bg-[#0B1220] lg:bottom-6 lg:left-[16.5rem]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan-400 text-sm font-bold text-white shadow-md shadow-accent/30">
          E
        </span>
        <span className="pr-1 text-left">
          <span className="block text-sm font-semibold text-white">Ema AI</span>
          <span className="block text-[11px] text-slate-400">
            Your AI Assistant
          </span>
          <span className="mt-0.5 block text-[10px] font-medium text-accent">
            Click to speak
          </span>
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
          <IconMicrophone className="h-4 w-4" />
        </span>
      </button>
    </div>
  );
}

function TrackerIcon({ state }: { state: TrackerState }) {
  if (state === "complete") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-2 ring-emerald-500/40">
        <IconCheckCircle className="h-5 w-5" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent ring-2 ring-accent/50">
        <IconSpinner className="h-5 w-5 animate-spin" />
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-500 ring-1 ring-white/15">
      <IconCube className="h-5 w-5" />
    </span>
  );
}

function MetaItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-sm text-slate-400">
      <span className="text-cyan-400/90">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-white">{value}</dd>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
