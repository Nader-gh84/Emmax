import { DEFAULT_COUNTRY } from "@/lib/location";
import {
  DEFAULT_QUOTE_TEMPLATE,
  type QuoteTemplateId,
} from "@/lib/pdf/quote-templates";

export type ProfileFieldKey =
  | "fullName"
  | "companyName"
  | "trade"
  | "country"
  | "city"
  | "email"
  | "phone"
  | "tagline"
  | "website"
  | "address";

export interface ProfileData {
  fullName: string;
  companyName: string;
  trade: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  tagline: string;
  website: string;
  address: string;
}

export interface QuoteDefaults {
  defaultTaxRate: number;
  defaultValidityDays: number;
  quoteTemplate: QuoteTemplateId;
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
  tagline: "",
  website: "",
  address: "",
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

export const BRANDING_FIELDS: ProfileFieldDefinition[] = [
  {
    key: "tagline",
    label: "Company Tagline",
    optional: true,
  },
  {
    key: "address",
    label: "Street Address",
    optional: true,
  },
  {
    key: "website",
    label: "Website",
    optional: true,
  },
];

export { DEFAULT_QUOTE_TEMPLATE };
