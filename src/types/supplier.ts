export type SupplierPaymentTermsType =
  | "net_15"
  | "net_30"
  | "monthly_minimum"
  | "none";

export interface Supplier {
  id: string;
  user_id: string;
  supplier_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  preferred_order_method: string | null;
  credit_limit?: number | null;
  minimum_monthly_payment?: number | null;
  payment_terms_type?: SupplierPaymentTermsType | null;
  default_account_number?: string | null;
  notes?: string | null;
  /** Storage path in supplier-logos bucket. */
  logo_url?: string | null;
  created_at: string;
}

export interface SupplierFormData {
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  location: string;
  preferred_order_method: string;
  credit_limit: string;
  minimum_monthly_payment: string;
  payment_terms_type: SupplierPaymentTermsType;
  default_account_number: string;
}

export const EMPTY_SUPPLIER_FORM: SupplierFormData = {
  supplier_name: "",
  contact_person: "",
  email: "",
  phone: "",
  location: "",
  preferred_order_method: "",
  credit_limit: "",
  minimum_monthly_payment: "",
  payment_terms_type: "net_30",
  default_account_number: "",
};

export const ORDER_METHODS = ["Email", "Phone", "Online Portal"] as const;

export const PAYMENT_TERMS_OPTIONS: {
  id: SupplierPaymentTermsType;
  label: string;
}[] = [
  { id: "net_15", label: "Net 15" },
  { id: "net_30", label: "Net 30" },
  { id: "monthly_minimum", label: "Monthly minimum" },
  { id: "none", label: "None" },
];

export function isSupplierPaymentTermsType(
  value: string
): value is SupplierPaymentTermsType {
  return (
    value === "net_15" ||
    value === "net_30" ||
    value === "monthly_minimum" ||
    value === "none"
  );
}
