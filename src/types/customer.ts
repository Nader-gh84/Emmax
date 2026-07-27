export interface Customer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  last_quoted_at: string | null;
  created_at: string;
}

export interface CustomerFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

export const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export function getCustomerDisplayName(customer: {
  first_name: string;
  last_name: string;
}): string {
  return `${customer.first_name} ${customer.last_name}`.trim();
}
