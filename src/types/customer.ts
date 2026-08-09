export type CustomerType = "residential" | "commercial";

export type CustomerGender = "male" | "female" | "unspecified";

export interface Customer {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  customer_type: CustomerType;
  website: string | null;
  gender: CustomerGender;
  avatar_url: string | null;
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
  customer_type: CustomerType;
  website: string;
  gender: CustomerGender;
}

export interface CustomerDocument {
  id: string;
  user_id: string;
  customer_id: string;
  project_id: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  user_id: string;
  customer_id: string;
  note_text: string;
  created_at: string;
}

export const EMPTY_CUSTOMER_FORM: CustomerFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  customer_type: "residential",
  website: "",
  gender: "unspecified",
};

export function isCustomerType(value: string): value is CustomerType {
  return value === "residential" || value === "commercial";
}

export function isCustomerGender(value: string): value is CustomerGender {
  return value === "male" || value === "female" || value === "unspecified";
}

export function getCustomerDisplayName(customer: {
  first_name: string;
  last_name: string;
}): string {
  return `${customer.first_name} ${customer.last_name}`.trim();
}

export function customerTypeLabel(type: CustomerType): string {
  return type === "commercial" ? "Commercial" : "Residential";
}

export function customerGenderLabel(gender: CustomerGender): string {
  switch (gender) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    default:
      return "Prefer not to say";
  }
}
