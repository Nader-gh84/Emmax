import { DEFAULT_COUNTRY } from "@/lib/location";

export type ProfileFieldKey =
  | "fullName"
  | "companyName"
  | "trade"
  | "country"
  | "city"
  | "email"
  | "phone";

export interface ProfileData {
  fullName: string;
  companyName: string;
  trade: string;
  country: string;
  city: string;
  email: string;
  phone: string;
}

export interface QuoteDefaults {
  defaultTaxRate: number;
  defaultValidityDays: number;
}

export interface BusinessProfile extends ProfileData, QuoteDefaults {
  id?: string;
  userId?: string;
}

export const EMPTY_PROFILE: ProfileData = {
  fullName: "",
  companyName: "",
  trade: "",
  country: DEFAULT_COUNTRY,
  city: "",
  email: "",
  phone: "",
};

export interface ProfileFieldDefinition {
  key: ProfileFieldKey;
  label: string;
  optional?: boolean;
}

export const TRADE_OPTIONS = [
  "Electrician",
  "Plumber",
  "HVAC",
  "Carpenter",
  "Other",
] as const;

export const PROFILE_FIELDS: ProfileFieldDefinition[] = [
  {
    key: "fullName",
    label: "Full Name",
  },
  {
    key: "companyName",
    label: "Company Name",
  },
  {
    key: "trade",
    label: "Trade/Profession",
  },
  {
    key: "country",
    label: "Country",
  },
  {
    key: "city",
    label: "City",
  },
  {
    key: "email",
    label: "Email",
  },
  {
    key: "phone",
    label: "Phone",
    optional: true,
  },
];
