export interface OrderMaterialRow {
  id: string;
  name: string;
  partNumber: string;
  brand: string;
  supplier: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  status: "In Quote" | "Added" | "Edited";
}

export interface OrderSupplierOption {
  id: string;
  name: string;
  email: string | null;
}

export interface OrderMaterialsMock {
  customerId: string;
  projectId: string;
  projectName: string;
  statusLabel: string;
  customerName: string;
  customerPhone: string;
  address: string;
  acceptedDate: string;
  quoteAmount: number;
  materials: OrderMaterialRow[];
  notes: string;
  primarySupplierId: string;
  deliveryOption: string;
  requiredByDate: string;
  projectReference: string;
  suppliers: OrderSupplierOption[];
  deliveryOptions: string[];
  taxRate: number;
}

const DEFAULT_DELIVERY_OPTIONS = [
  "Delivery to Site",
  "Pickup at Counter",
  "Will Call",
];

/** Build Order Materials view model from live records (no mock kitchen materials). */
export function buildOrderMaterialsViewModel(input: {
  customerId: string;
  projectId: string;
  projectName: string;
  customerName: string;
  customerPhone?: string | null;
  address?: string | null;
  acceptedDate?: string;
  quoteAmount: number;
  materials?: OrderMaterialRow[];
  notes?: string | null;
  primarySupplierId?: string;
  deliveryOption?: string | null;
  requiredByDate?: string | null;
  projectReference?: string | null;
  suppliers?: OrderSupplierOption[];
  taxRate?: number;
}): OrderMaterialsMock {
  const projectName = input.projectName.trim() || "Untitled project";
  const customerName = input.customerName.trim() || "Customer";

  return {
    customerId: input.customerId,
    projectId: input.projectId,
    projectName,
    statusLabel: "Quote Accepted",
    customerName,
    customerPhone: input.customerPhone?.trim() || "—",
    address: input.address?.trim() || "—",
    acceptedDate: input.acceptedDate?.trim() || "—",
    quoteAmount: Number(input.quoteAmount) || 0,
    materials: input.materials ?? [],
    notes: input.notes?.trim() || "",
    primarySupplierId: input.primarySupplierId || "",
    deliveryOption: input.deliveryOption?.trim() || "Delivery to Site",
    requiredByDate: input.requiredByDate?.trim() || "",
    projectReference:
      input.projectReference?.trim() || `${projectName} — ${customerName}`,
    suppliers: input.suppliers ?? [],
    deliveryOptions: DEFAULT_DELIVERY_OPTIONS,
    taxRate: input.taxRate ?? 0.05,
  };
}

export function formatOrderMoney(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
