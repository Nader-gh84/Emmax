import { IconUsers } from "@/components/dashboard/icons";

interface CustomersEmptyStateProps {
  onAddCustomer: () => void;
}

export function CustomersEmptyState({ onAddCustomer }: CustomersEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/30">
        <IconUsers className="h-10 w-10 text-accent" />
      </div>

      <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
        No customers yet
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
        Add your first customer to start managing contacts, projects, and quotes
        in one place.
      </p>

      <button
        type="button"
        onClick={onAddCustomer}
        className="mt-8 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
      >
        <span className="text-lg leading-none" aria-hidden="true">
          +
        </span>
        Add Customer
      </button>
    </div>
  );
}
