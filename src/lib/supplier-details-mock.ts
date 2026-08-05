export type SupplierDetailsTab =
  | "invoices"
  | "payments"
  | "statements"
  | "documents"
  | "notes";

export type SupplierInvoiceStatus =
  | "paid"
  | "partial"
  | "unpaid"
  | "overdue";

export type SupplierInvoice = {
  id: string;
  invoiceNumber: string;
  projectName: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paid: number;
  balance: number;
  status: SupplierInvoiceStatus;
};

export type SupplierPayment = {
  id: string;
  paymentNumber: string;
  method: string;
  amount: number;
  paidAt: string;
  hasReceipt: boolean;
};

export type SupplierDocument = {
  id: string;
  name: string;
  kind: "invoice" | "statement" | "receipt" | "other";
  uploadedAt: string;
  sizeLabel: string;
  typeLabel: string;
};

export type SupplierDetailsViewModel = {
  id: string;
  name: string;
  status: "active" | "inactive";
  phone: string | null;
  email: string | null;
  address: string | null;
  contactPerson: string | null;
  paymentTerms: string;
  defaultAccountNumber: string;
  summary: {
    totalPurchases: number;
    totalPaid: number;
    outstandingBalance: number;
    overdueAmount: number;
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
    totalInvoices: number;
    totalPayments: number;
    averagePaymentDays: number;
    currentOutstanding: number;
  };
  invoices: SupplierInvoice[];
  payments: SupplierPayment[];
  documents: SupplierDocument[];
  notes: string;
};

export const SUPPLIER_DETAILS_TABS: {
  id: SupplierDetailsTab;
  label: string;
}[] = [
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "statements", label: "Statements" },
  { id: "documents", label: "Documents" },
  { id: "notes", label: "Notes" },
];

/** Stage-1 mock accounting payload — structure only; later phases wire real data. */
export function buildMockSupplierDetails(input?: {
  id?: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactPerson?: string | null;
}): SupplierDetailsViewModel {
  const id = input?.id || "demo-supplier";
  const name = input?.name?.trim() || "Pacific Electrical Supply";

  return {
    id,
    name,
    status: "active",
    phone: input?.phone || "(604) 555-0142",
    email: input?.email || "orders@pacificelectrical.ca",
    address:
      input?.address || "2200 Clark Drive, Vancouver, BC V5N 3G8",
    contactPerson: input?.contactPerson || "Marcus Chen",
    paymentTerms: "Net 30",
    defaultAccountNumber: "ACC-88421",
    summary: {
      totalPurchases: 48250,
      totalPaid: 36120,
      outstandingBalance: 12130,
      overdueAmount: 4280,
      lastPaymentDate: "2026-07-28",
      lastPaymentAmount: 2450,
      totalInvoices: 8,
      totalPayments: 5,
      averagePaymentDays: 18,
      currentOutstanding: 7850,
    },
    invoices: [
      {
        id: "inv-1",
        invoiceNumber: "PES-10482",
        projectName: "Kitchen electrical upgrade",
        customerName: "Sarah Mitchell",
        invoiceDate: "2026-07-02",
        dueDate: "2026-08-01",
        amount: 6120,
        paid: 6120,
        balance: 0,
        status: "paid",
      },
      {
        id: "inv-2",
        invoiceNumber: "PES-10501",
        projectName: "Panel replacement — Oak St",
        customerName: "James Okonkwo",
        invoiceDate: "2026-07-10",
        dueDate: "2026-08-09",
        amount: 3840,
        paid: 1500,
        balance: 2340,
        status: "partial",
      },
      {
        id: "inv-3",
        invoiceNumber: "PES-10518",
        projectName: "Lighting retrofit",
        customerName: "Ava Nguyen",
        invoiceDate: "2026-07-18",
        dueDate: "2026-08-17",
        amount: 5510,
        paid: 0,
        balance: 5510,
        status: "unpaid",
      },
      {
        id: "inv-4",
        invoiceNumber: "PES-10455",
        projectName: "Garage EV charger",
        customerName: "Daniel Brooks",
        invoiceDate: "2026-06-12",
        dueDate: "2026-07-12",
        amount: 2480,
        paid: 0,
        balance: 2480,
        status: "overdue",
      },
      {
        id: "inv-5",
        invoiceNumber: "PES-10461",
        projectName: "Basement suite wiring",
        customerName: "Priya Shah",
        invoiceDate: "2026-06-20",
        dueDate: "2026-07-20",
        amount: 1800,
        paid: 0,
        balance: 1800,
        status: "overdue",
      },
      {
        id: "inv-6",
        invoiceNumber: "PES-10390",
        projectName: "Commercial lobby LED",
        customerName: "Northside Properties",
        invoiceDate: "2026-05-08",
        dueDate: "2026-06-07",
        amount: 9250,
        paid: 9250,
        balance: 0,
        status: "paid",
      },
      {
        id: "inv-7",
        invoiceNumber: "PES-10530",
        projectName: "Service upgrade 200A",
        customerName: "Elena Vargas",
        invoiceDate: "2026-07-25",
        dueDate: "2026-08-24",
        amount: 4200,
        paid: 0,
        balance: 4200,
        status: "unpaid",
      },
      {
        id: "inv-8",
        invoiceNumber: "PES-10355",
        projectName: "Outdoor lighting package",
        customerName: "Chris Patel",
        invoiceDate: "2026-04-15",
        dueDate: "2026-05-15",
        amount: 15000,
        paid: 15000,
        balance: 0,
        status: "paid",
      },
    ],
    payments: [
      {
        id: "pay-1",
        paymentNumber: "PMT-2201",
        method: "E-Transfer",
        amount: 2450,
        paidAt: "2026-07-28",
        hasReceipt: true,
      },
      {
        id: "pay-2",
        paymentNumber: "PMT-2188",
        method: "Cheque",
        amount: 6120,
        paidAt: "2026-07-15",
        hasReceipt: true,
      },
      {
        id: "pay-3",
        paymentNumber: "PMT-2154",
        method: "Credit Card",
        amount: 1500,
        paidAt: "2026-07-05",
        hasReceipt: false,
      },
      {
        id: "pay-4",
        paymentNumber: "PMT-2102",
        method: "E-Transfer",
        amount: 9250,
        paidAt: "2026-06-18",
        hasReceipt: true,
      },
      {
        id: "pay-5",
        paymentNumber: "PMT-2066",
        method: "ACH",
        amount: 16800,
        paidAt: "2026-05-22",
        hasReceipt: true,
      },
    ],
    documents: [
      {
        id: "doc-1",
        name: "PES-10518 Invoice.pdf",
        kind: "invoice",
        uploadedAt: "2026-07-18",
        sizeLabel: "248 KB",
        typeLabel: "PDF",
      },
      {
        id: "doc-2",
        name: "July Statement.pdf",
        kind: "statement",
        uploadedAt: "2026-07-31",
        sizeLabel: "412 KB",
        typeLabel: "PDF",
      },
      {
        id: "doc-3",
        name: "PMT-2201 Receipt.pdf",
        kind: "receipt",
        uploadedAt: "2026-07-28",
        sizeLabel: "96 KB",
        typeLabel: "PDF",
      },
      {
        id: "doc-4",
        name: "PES-10482 Invoice.pdf",
        kind: "invoice",
        uploadedAt: "2026-07-02",
        sizeLabel: "231 KB",
        typeLabel: "PDF",
      },
      {
        id: "doc-5",
        name: "June Statement.pdf",
        kind: "statement",
        uploadedAt: "2026-06-30",
        sizeLabel: "388 KB",
        typeLabel: "PDF",
      },
      {
        id: "doc-6",
        name: "Credit application.pdf",
        kind: "other",
        uploadedAt: "2026-03-12",
        sizeLabel: "1.1 MB",
        typeLabel: "PDF",
      },
    ],
    notes:
      "Prefers email for PO confirmations. Counter closes at 4:30 PM. Ask for Marcus on will-call orders.",
  };
}

export function formatSupplierMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSupplierDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getSupplierInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || "?";
}

export function supplierInvoiceStatusLabel(
  status: SupplierInvoiceStatus
): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "partial":
      return "Partial";
    case "unpaid":
      return "Unpaid";
    case "overdue":
      return "Overdue";
  }
}

export function supplierInvoiceStatusClass(
  status: SupplierInvoiceStatus
): string {
  switch (status) {
    case "paid":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "partial":
      return "bg-amber-500/15 text-amber-200 ring-amber-500/30";
    case "unpaid":
      return "bg-slate-500/15 text-slate-300 ring-slate-500/30";
    case "overdue":
      return "bg-red-500/15 text-red-300 ring-red-500/30";
  }
}
