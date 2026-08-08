"use client";

import {
  formatSupplierDate,
  type SupplierDocument,
} from "@/lib/supplier-details-mock";

function documentIconClass(kind: SupplierDocument["kind"]): string {
  switch (kind) {
    case "invoice":
      return "bg-accent/15 text-accent ring-accent/30";
    case "statement":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "receipt":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    default:
      return "bg-white/10 text-slate-300 ring-white/15";
  }
}

function DocumentGlyph({ kind }: { kind: SupplierDocument["kind"] }) {
  const className = "h-6 w-6";
  if (kind === "receipt") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export function SupplierDocumentsSection({
  documents,
}: {
  documents: SupplierDocument[];
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Recent Documents
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Document vault comes in a later stage. Payment receipts will appear
            here once uploads are wired.
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-semibold text-accent hover:text-blue-400"
        >
          View all
        </button>
      </div>

      {documents.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-slate-500">
          No documents yet.
        </p>
      ) : (
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20 hover:bg-white/[0.04]"
          >
            <div
              className={`flex h-24 items-center justify-center rounded-lg ring-1 ${documentIconClass(
                doc.kind
              )}`}
            >
              <DocumentGlyph kind={doc.kind} />
            </div>
            <p className="mt-3 truncate text-sm font-medium text-white">
              {doc.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatSupplierDate(doc.uploadedAt)} · {doc.sizeLabel} ·{" "}
              {doc.typeLabel}
            </p>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
