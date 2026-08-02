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

export function getMockOrderMaterials(
  customerId = "mock-customer-ali",
  projectId = "mock-project-kitchen"
): OrderMaterialsMock {
  return {
    customerId,
    projectId,
    projectName: "Kitchen Renovation",
    statusLabel: "Quote Accepted",
    customerName: "Ali Tajdar",
    customerPhone: "(604) 555-0142",
    address: "1847 Maple Ridge Ave, Vancouver, BC V6J 2N8",
    acceptedDate: "Jul 28, 2026",
    quoteAmount: 18450,
    notes:
      "Please stage pot lights and wire for first delivery. Call before drop-off.",
    primarySupplierId: "",
    deliveryOption: "Delivery to Site",
    requiredByDate: "2026-08-15",
    projectReference: "Kitchen Renovation — Ali Tajdar",
    suppliers: [],
    deliveryOptions: [
      "Delivery to Site",
      "Pickup at Counter",
      "Will Call",
    ],
    taxRate: 0.05,
    materials: [
      {
        id: "m1",
        name: '4" LED Pot Light — Warm White 3000K',
        partNumber: "EEL-PL4-30K",
        brand: "EEL",
        supplier: "EECOL Electric",
        quantity: 12,
        unit: "ea",
        unitPrice: 28.5,
        status: "In Quote",
      },
      {
        id: "m2",
        name: "NMD90 14/2 Copper Wire — 75m",
        partNumber: "SW-NMD-142-75",
        brand: "Southwire",
        supplier: "Gescan",
        quantity: 2,
        unit: "roll",
        unitPrice: 89.0,
        status: "In Quote",
      },
      {
        id: "m3",
        name: "Decora Receptacle 15A — White",
        partNumber: "LEV-5325-W",
        brand: "Leviton",
        supplier: "EECOL Electric",
        quantity: 8,
        unit: "ea",
        unitPrice: 4.25,
        status: "In Quote",
      },
      {
        id: "m4",
        name: "Decora Single Pole Switch — White",
        partNumber: "LEV-5601-2W",
        brand: "Leviton",
        supplier: "EECOL Electric",
        quantity: 6,
        unit: "ea",
        unitPrice: 3.95,
        status: "In Quote",
      },
      {
        id: "m5",
        name: "Homeline 15A Single Pole Breaker",
        partNumber: "SQD-HOM115",
        brand: "Square D",
        supplier: "Gescan",
        quantity: 4,
        unit: "ea",
        unitPrice: 12.75,
        status: "In Quote",
      },
      {
        id: "m6",
        name: 'Octagon Box 4" — Deep',
        partNumber: "IBV-OCT4-D",
        brand: "IBERVILLE",
        supplier: "EECOL Electric",
        quantity: 10,
        unit: "ea",
        unitPrice: 2.15,
        status: "In Quote",
      },
    ],
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
