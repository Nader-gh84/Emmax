"use client";

import {
  QUOTE_TEMPLATE_IDS,
  QUOTE_TEMPLATE_META,
  type QuoteTemplateId,
} from "@/lib/pdf/quote-templates";

function TemplateThumb({
  id,
  selected,
}: {
  id: QuoteTemplateId;
  selected: boolean;
}) {
  const accent = QUOTE_TEMPLATE_META[id].accent;

  if (id === "classic_blue") {
    return (
      <div
        className={`relative h-36 w-full overflow-hidden rounded-lg border bg-white ${
          selected ? "border-accent ring-2 ring-accent/40" : "border-white/15"
        }`}
      >
        <div className="flex items-start justify-between px-2.5 pt-2">
          <div className="space-y-1">
            <div className="h-4 w-4 rotate-45 border-2 border-slate-400" />
            <div className="h-1.5 w-14 rounded bg-slate-800" />
            <div className="h-1 w-10 rounded bg-slate-300" />
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-900">
              PRE-<span style={{ color: accent }}>INVOICE</span>
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="ml-auto h-1 w-12 rounded bg-slate-200" />
              <div className="ml-auto h-1 w-10 rounded bg-slate-200" />
            </div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 px-2">
          <div className="h-6 rounded border border-slate-200 bg-slate-50" />
          <div className="h-6 rounded border border-slate-200 bg-slate-50" />
        </div>
        <div className="mx-2 mt-2 h-3 rounded" style={{ background: accent }} />
        <div className="mx-2 mt-1 space-y-1">
          <div className="h-1.5 rounded bg-slate-100" />
          <div className="h-1.5 rounded bg-slate-100" />
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-3 origin-bottom-left skew-x-[-20deg]"
          style={{ background: accent }}
        />
      </div>
    );
  }

  if (id === "bold_green") {
    return (
      <div
        className={`relative h-36 w-full overflow-hidden rounded-lg border bg-white ${
          selected ? "border-accent ring-2 ring-accent/40" : "border-white/15"
        }`}
      >
        <div className="flex h-14">
          <div className="flex-1 space-y-1 px-2 pt-2">
            <div
              className="h-4 w-4 rotate-45"
              style={{ background: accent }}
            />
            <div className="h-1.5 w-12 rounded bg-slate-800" />
          </div>
          <div
            className="w-[45%] skew-x-[-12deg] px-2 pt-2 text-white"
            style={{ background: accent }}
          >
            <div className="skew-x-[12deg] text-[9px] font-bold">PRE-INVOICE</div>
            <div className="mt-1 skew-x-[12deg] space-y-0.5">
              <div className="h-1 w-10 rounded bg-white/50" />
              <div className="h-1 w-8 rounded bg-white/40" />
            </div>
          </div>
        </div>
        <div className="mx-2 mt-2 h-3 rounded" style={{ background: accent }} />
        <div className="mx-2 mt-1 space-y-1">
          <div className="h-1.5 rounded bg-slate-100" />
          <div className="h-1.5 rounded bg-slate-100" />
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-5 skew-x-[-8deg]"
          style={{ background: accent }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative h-36 w-full overflow-hidden rounded-lg border bg-white ${
        selected ? "border-accent ring-2 ring-accent/40" : "border-white/15"
      }`}
    >
      <div className="flex items-start justify-between px-2.5 pt-2">
        <div
          className="border px-1 py-0.5 text-[8px] font-bold tracking-wider"
          style={{ borderColor: accent, color: accent }}
        >
          LOGO
        </div>
        <div className="text-[10px] font-bold" style={{ color: accent }}>
          PRE-INVOICE
        </div>
      </div>
      <div className="mt-2 h-4 w-full" style={{ background: accent }} />
      <div className="mt-2 flex gap-2 px-2">
        <div className="flex-1 space-y-1">
          <div className="h-1.5 w-10 rounded bg-slate-300" />
          <div className="h-1 w-14 rounded bg-slate-100" />
          <div className="h-1 w-12 rounded bg-slate-100" />
        </div>
        <div className="h-10 w-16 rounded bg-slate-900 p-1">
          <div className="text-[7px] text-white/70">amount DUE</div>
          <div className="text-[9px] font-bold" style={{ color: accent }}>
            $0.00
          </div>
        </div>
      </div>
      <div className="mx-2 mt-2 h-3 rounded" style={{ background: accent }} />
      <div
        className="absolute bottom-0 left-0 right-0 flex h-5 items-center justify-center text-[7px] font-bold text-white"
        style={{ background: accent }}
      >
        THANK YOU FOR YOUR BUSINESS
      </div>
    </div>
  );
}

export function QuoteTemplatePicker({
  value,
  onChange,
  disabled,
}: {
  value: QuoteTemplateId;
  onChange: (next: QuoteTemplateId) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-sm font-semibold text-white">Quote Template</legend>
      <p className="text-sm text-slate-400">
        Choose the default Quote PDF layout. Used when you Create
        Quote, download, or send.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {QUOTE_TEMPLATE_IDS.map((id) => {
          const meta = QUOTE_TEMPLATE_META[id];
          const selected = value === id;
          return (
            <label
              key={id}
              className={`cursor-pointer rounded-xl border p-2 transition ${
                selected
                  ? "border-accent bg-accent/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="quote-template"
                className="sr-only"
                checked={selected}
                onChange={() => onChange(id)}
              />
              <TemplateThumb id={id} selected={selected} />
              <div className="mt-2 px-0.5">
                <p className="text-sm font-semibold text-white">{meta.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                  {meta.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
