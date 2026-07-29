"use client";

import { useMemo, useState } from "react";
import {
  IconDocument,
  IconEmployee,
  IconMicrophone,
  IconSuppliers,
  IconUsers,
} from "@/components/dashboard/icons";
import {
  IconMail,
  IconPhone,
  IconSend,
  IconSparkle,
} from "@/components/dashboard/workspace-icons";
import { touchBtnPrimary, touchBtnSecondary } from "@/components/quotes/ui";
import { formatCurrency } from "@/types/quote";

type LineKind = "material" | "labour";

interface MockLineItem {
  id: string;
  kind: LineKind;
  description: string;
  brand: string;
  qty: number;
  unit: string;
  unitPrice: number;
}

const MOCK_ITEMS: MockLineItem[] = [
  {
    id: "1",
    kind: "material",
    description: '14/2 NMD90 Wire',
    brand: "Nexans",
    qty: 250,
    unit: "ft",
    unitPrice: 0.85,
  },
  {
    id: "2",
    kind: "material",
    description: "20A Dual USB Outlet",
    brand: "Leviton",
    qty: 8,
    unit: "each",
    unitPrice: 42.5,
  },
  {
    id: "3",
    kind: "material",
    description: "LED Pot Light 4in",
    brand: "Liteline",
    qty: 12,
    unit: "each",
    unitPrice: 28,
  },
  {
    id: "4",
    kind: "labour",
    description: "Labour – Installation",
    brand: "",
    qty: 6,
    unit: "hour",
    unitPrice: 95,
  },
  {
    id: "5",
    kind: "labour",
    description: "Labour – Rough-in",
    brand: "",
    qty: 3,
    unit: "hour",
    unitPrice: 85,
  },
];

const MOCK_TRANSCRIPT =
  "Need 250 feet of 14/2 Nexans, eight Leviton 20 amp USB outlets, twelve Liteline pot lights, six hours installation labour and three hours rough-in.";

const ACTIONS = [
  { id: "download", label: "Download PDF", icon: IconDocument },
  { id: "draft", label: "Save to Draft", icon: IconBookmark },
  { id: "edit", label: "Edit", icon: IconPencil },
  { id: "contact", label: "Send to Contact", icon: IconSend },
  { id: "new-customer", label: "Send to New Customer", icon: IconUserPlus },
  { id: "supplier", label: "Send to Supplier", icon: IconSuppliers },
] as const;

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function IconBookmark({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function IconUserPlus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

function IconMerge({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconLightbulb({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function IconCatalog({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h10" />
    </svg>
  );
}

function lineTotal(item: MockLineItem) {
  return item.qty * item.unitPrice;
}

export function VoiceQuoteBuilder() {
  const [isRecording, setIsRecording] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [transcript, setTranscript] = useState(MOCK_TRANSCRIPT);
  const [priceMode, setPriceMode] = useState<"detailed" | "merged">("detailed");
  const [mobileAction, setMobileAction] = useState("");
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("amount");

  const gstRate = 5;
  const pstRate = 7;
  const discountAmount = 50;

  const materialsTotal = useMemo(
    () =>
      MOCK_ITEMS.filter((item) => item.kind === "material").reduce(
        (sum, item) => sum + lineTotal(item),
        0
      ),
    []
  );
  const labourTotal = useMemo(
    () =>
      MOCK_ITEMS.filter((item) => item.kind === "labour").reduce(
        (sum, item) => sum + lineTotal(item),
        0
      ),
    []
  );
  const subtotal = materialsTotal + labourTotal;
  const taxable = Math.max(subtotal - discountAmount, 0);
  const gst = taxable * (gstRate / 100);
  const pst = taxable * (pstRate / 100);
  const grandTotal = taxable + gst + pst;

  return (
    <div className="flex min-h-full min-w-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Voice Quote Builder
              </h1>
              <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                Beta
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Speak naturally and Ema will build the pre-invoice for you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className={`${touchBtnSecondary} gap-2 text-sm`}
          >
            <IconInfo className="h-4 w-4" />
            How it works?
          </button>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Step 1 */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  <span className="mr-2 text-accent">1</span>
                  Record Your Voice
                </h2>
                {isRecording && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setIsRecording((current) => !current)}
                  className={`flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition ${
                    isRecording
                      ? "bg-red-500 shadow-red-500/30 ring-4 ring-red-500/20"
                      : "bg-accent shadow-accent/30 ring-4 ring-accent/20 hover:bg-blue-600"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  <IconMicrophone className="h-10 w-10 text-white" />
                </button>
                <p className="mt-3 text-sm font-medium text-slate-300">
                  {isRecording ? "Tap to stop" : "Tap to record"}
                </p>

                <div className="mt-5 flex h-12 w-full items-end justify-center gap-1 rounded-xl border border-white/10 bg-navy/50 px-3 py-2">
                  {Array.from({ length: 24 }).map((_, index) => (
                    <span
                      key={index}
                      className={`w-1 rounded-full bg-cyan-400/80 ${
                        isRecording ? "animate-waveform" : "opacity-40"
                      }`}
                      style={{
                        height: `${20 + ((index * 17) % 60)}%`,
                        animationDelay: `${index * 0.05}s`,
                      }}
                    />
                  ))}
                </div>

                <p className="mt-3 font-mono text-2xl font-bold text-white">
                  {isRecording ? "00:18" : "00:00"}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <IconCheck className="h-3 w-3" />
                  </span>
                  Auto-stop: 2 sec silence
                </p>
              </div>
            </section>

            {/* Step 2 */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  <span className="mr-2 text-accent">2</span>
                  Your Transcript
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditingTranscript((current) => !current)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-blue-400"
                >
                  <IconPencil className="h-3.5 w-3.5" />
                  Edit
                </button>
              </div>
              {isEditingTranscript ? (
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  className="mt-4 min-h-[120px] w-full rounded-xl border border-white/10 bg-navy/40 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-accent"
                />
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  {transcript}
                </p>
              )}
            </section>
          </div>

          {/* Main column */}
          <div className="min-w-0 space-y-4">
            {/* Step 3 status */}
            <section className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 via-white/[0.04] to-cyan-500/10 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-cyan-400 text-sm font-bold text-white shadow-lg shadow-accent/30">
                  Ema
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-white sm:text-lg">
                    Ema has generated your pre-invoice
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    {MOCK_ITEMS.length} items added
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    You can edit items, merge materials or continue speaking.
                  </p>
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    Pre-invoice generated successfully!
                  </p>
                </div>
              </div>
            </section>

            {/* Step 4 table */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold text-white">
                  <span className="mr-2 text-accent">4</span>
                  Your Pre-Invoice
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-blue-400"
                  >
                    <IconPencil className="h-3.5 w-3.5" />
                    Edit Items
                  </button>
                  <button
                    type="button"
                    className={`${touchBtnSecondary} gap-2 px-3 py-2 text-xs`}
                    title="Combine materials into a single line on the customer-facing quote"
                  >
                    <IconMerge className="h-3.5 w-3.5" />
                    Merge Materials
                    <IconInfo className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-2 font-medium">#</th>
                      <th className="pb-3 pr-2 font-medium">Description</th>
                      <th className="pb-3 pr-2 font-medium">Brand</th>
                      <th className="pb-3 pr-2 font-medium">Qty</th>
                      <th className="pb-3 pr-2 font-medium">Unit</th>
                      <th className="pb-3 pr-2 font-medium">Unit Price</th>
                      <th className="pb-3 pr-2 font-medium">Total</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_ITEMS.map((item, index) => (
                      <tr key={item.id} className="border-b border-white/5">
                        <td className="py-3 pr-2 text-slate-500">{index + 1}</td>
                        <td className="py-3 pr-2 font-medium text-white">
                          {item.description}
                        </td>
                        <td className="py-3 pr-2 text-slate-300">
                          {item.kind === "labour" ? (
                            <span className="inline-flex items-center gap-1.5 text-cyan-400">
                              <IconEmployee className="h-4 w-4" />
                              Labour
                            </span>
                          ) : (
                            item.brand
                          )}
                        </td>
                        <td className="py-3 pr-2 text-slate-300">{item.qty}</td>
                        <td className="py-3 pr-2 text-slate-300">{item.unit}</td>
                        <td className="py-3 pr-2 text-slate-300">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-3 pr-2 font-medium text-white">
                          {formatCurrency(lineTotal(item))}
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                            aria-label={`Delete ${item.description}`}
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button type="button" className={`${touchBtnSecondary} gap-2`}>
                  + Add item manually
                </button>
                <button type="button" className={`${touchBtnSecondary} gap-2`}>
                  <IconCatalog className="h-4 w-4" />
                  Smart Add from Catalog
                </button>
              </div>
            </section>

            {/* Summary */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">Summary</h2>
                <button type="button" className={`${touchBtnPrimary} px-4 py-2 text-sm`}>
                  Calculate
                </button>
              </div>

              <div className="mt-5 grid gap-6 md:grid-cols-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Materials Total</span>
                    <span className="text-white">{formatCurrency(materialsTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Labour Total</span>
                    <span className="text-white">{formatCurrency(labourTotal)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-slate-400">Discount</span>
                      <div className="flex rounded-lg border border-white/10 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setDiscountMode("amount")}
                          className={`rounded-md px-2 py-1 ${
                            discountMode === "amount"
                              ? "bg-accent text-white"
                              : "text-slate-400"
                          }`}
                        >
                          $
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountMode("percent")}
                          className={`rounded-md px-2 py-1 ${
                            discountMode === "percent"
                              ? "bg-accent text-white"
                              : "text-slate-400"
                          }`}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>{discountMode === "amount" ? "$ amount" : "% off"}</span>
                      <span>
                        {discountMode === "amount"
                          ? formatCurrency(discountAmount)
                          : "4.2%"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({gstRate}%)</span>
                    <span className="text-white">{formatCurrency(gst)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>PST ({pstRate}%)</span>
                    <span className="text-white">{formatCurrency(pst)}</span>
                  </div>
                </div>

                <div className="flex flex-col justify-center rounded-xl border border-accent/20 bg-accent/10 px-4 py-5 text-center md:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Grand Total
                  </p>
                  <p className="mt-1 text-3xl font-bold text-accent">
                    {formatCurrency(grandTotal)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-cyan-400">CAD</p>
                </div>
              </div>
            </section>

            {/* Desktop action bar */}
            <section className="hidden gap-2 md:grid md:grid-cols-3 lg:grid-cols-6">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    className={`${touchBtnSecondary} flex-col gap-1.5 px-2 py-3 text-xs`}
                  >
                    <Icon className="h-4 w-4 text-cyan-400" />
                    {action.label}
                  </button>
                );
              })}
            </section>

            {/* Mobile action bar */}
            <section className="flex gap-2 md:hidden">
              <select
                value={mobileAction}
                onChange={(event) => setMobileAction(event.target.value)}
                className="min-h-[44px] flex-1 rounded-xl border border-white/20 bg-white/5 px-3 text-sm text-white outline-none focus:border-accent"
              >
                <option value="" className="bg-navy">
                  Choose action...
                </option>
                {ACTIONS.map((action) => (
                  <option key={action.id} value={action.id} className="bg-navy">
                    {action.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!mobileAction}
                className={`${touchBtnPrimary} px-5 disabled:opacity-40`}
              >
                Send
              </button>
            </section>

            {/* Below action bar */}
            <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setIsRecording(true)}
                className="flex items-center gap-3 text-left transition hover:opacity-90"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <IconMicrophone className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">
                    Continue Speaking
                  </span>
                  <span className="block text-xs text-slate-400">
                    Add more items or make changes
                  </span>
                </span>
                <IconChevron className="ml-1 h-4 w-4 text-slate-500" />
              </button>

              <p className="inline-flex items-start gap-2 text-xs text-slate-400 sm:max-w-xs">
                <IconLightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                Tip: Be specific about brand, size, quantity and work type for
                better results.
              </p>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-blue-400"
              >
                <IconSparkle className="h-4 w-4" />
                Need help? Ask Ema
              </button>
            </section>

            {!showSidebar && (
              <button
                type="button"
                onClick={() => setShowSidebar(true)}
                className={`${touchBtnSecondary} hidden xl:inline-flex`}
              >
                Show Pre-Invoice Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      {showSidebar && (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-white/10 bg-[#0B1220] xl:flex">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Pre-Invoice Details
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                  Q-2026-0001
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  Draft
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSidebar(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Close details"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {[
              { label: "Customer", value: "Sarah Mitchell · Apex Build" },
              { label: "Project", value: "Kitchen Reno — Phase 2" },
              { label: "Valid Until", value: "Aug 28, 2026" },
            ].map((field) => (
              <div key={field.label}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {field.label}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-accent hover:text-blue-400"
                  >
                    Change
                  </button>
                </div>
                <p className="mt-1 text-sm text-white">{field.value}</p>
              </div>
            ))}

            <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
              {[
                ["Materials Total", formatCurrency(materialsTotal)],
                ["Labour Total", formatCurrency(labourTotal)],
                ["Subtotal", formatCurrency(subtotal)],
                [`GST (${gstRate}%)`, formatCurrency(gst)],
                [`PST (${pstRate}%)`, formatCurrency(pst)],
                ["Discount", formatCurrency(discountAmount)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-slate-400">
                  <span>{label}</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Grand Total
                </p>
                <p className="mt-1 text-2xl font-bold text-accent">
                  {formatCurrency(grandTotal)}
                </p>
                <p className="text-xs font-semibold text-cyan-400">CAD</p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-semibold text-white">Price Options</p>
              <div className="mt-3 space-y-2">
                {[
                  {
                    value: "detailed" as const,
                    label: "Show Detailed Materials",
                  },
                  {
                    value: "merged" as const,
                    label: "Merged Materials (Hide Details)",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                      priceMode === option.value
                        ? "border-accent/40 bg-accent/10 text-white"
                        : "border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="price-mode"
                      checked={priceMode === option.value}
                      onChange={() => setPriceMode(option.value)}
                      className="accent-blue-500"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Notes</p>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-label="Edit notes"
                >
                  <IconPencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Customer requested evening delivery window and matching outlet
                finishes throughout the kitchen.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
              {[
                { label: "Call", icon: IconPhone },
                { label: "Email", icon: IconMail },
                { label: "Message", icon: IconSend },
                { label: "Notes", icon: IconPencil },
                { label: "More", icon: IconUsers },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                  >
                    <Icon className="h-3.5 w-3.5 text-cyan-400" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}

      {/* How it works modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={() => setShowHowItWorks(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-navy p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">How it works</h2>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-300">
              <li>1. Tap the mic and describe the job naturally.</li>
              <li>2. Ema transcribes your voice and extracts materials + labour.</li>
              <li>3. Review the pre-invoice, edit items, then save or send.</li>
              <li>4. Use Continue Speaking to add more details anytime.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className={`${touchBtnPrimary} mt-6 w-full`}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
