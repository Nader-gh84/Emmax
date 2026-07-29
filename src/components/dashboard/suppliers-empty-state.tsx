import { IconSuppliers } from "@/components/dashboard/icons";

interface SuppliersEmptyStateProps {
  onAddSupplier: () => void;
}

export function SuppliersEmptyState({ onAddSupplier }: SuppliersEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/30">
        <IconSuppliers className="h-10 w-10 text-accent" />
      </div>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
        No suppliers yet
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
        Add your first supplier to manage materials, contacts, and orders in one
        place.
      </p>

      <button
        type="button"
        onClick={onAddSupplier}
        className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
      >
        <span className="text-lg leading-none" aria-hidden="true">
          +
        </span>
        Add Supplier
      </button>
    </div>
  );
}
