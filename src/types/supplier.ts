export interface Supplier {
  id: string;
  user_id: string;
  supplier_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  preferred_order_method: string | null;
  created_at: string;
}

export interface SupplierFormData {
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  location: string;
  preferred_order_method: string;
}

export const EMPTY_SUPPLIER_FORM: SupplierFormData = {
  supplier_name: "",
  contact_person: "",
  email: "",
  phone: "",
  location: "",
  preferred_order_method: "",
};

export const ORDER_METHODS = ["Email", "Phone", "Online Portal"] as const;
