export type ProfileFieldKey =
  | "fullName"
  | "companyName"
  | "trade"
  | "city"
  | "email"
  | "phone";

export interface ProfileData {
  fullName: string;
  companyName: string;
  trade: string;
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
  city: "",
  email: "",
  phone: "",
};

export interface ProfileFieldDefinition {
  key: ProfileFieldKey;
  label: string;
  question: string;
  optional?: boolean;
}

export const PROFILE_FIELDS: ProfileFieldDefinition[] = [
  {
    key: "fullName",
    label: "Full Name",
    question:
      "To get you set up, what's your full name? I just need your full name, first and last.",
  },
  {
    key: "companyName",
    label: "Company Name",
    question:
      "What's your company name? If you don't have one, just say 'none'.",
  },
  {
    key: "trade",
    label: "Trade/Profession",
    question:
      "What trade do you work in? For example, electrician, plumber, HVAC, or carpenter.",
  },
  {
    key: "city",
    label: "City",
    question: "What city are you located in?",
  },
  {
    key: "email",
    label: "Email",
    question: "What's your email address?",
  },
  {
    key: "phone",
    label: "Phone",
    question:
      "Do you want to add a phone number for suppliers? Say your number, or 'no' to skip.",
    optional: true,
  },
];

export const MIC_DENIED_MESSAGE =
  "No problem! We can keep going in typing mode. You'll see all questions in a simple table view, just type your answers in each box. And hey, if you change your mind later, you can always say 'enable microphone' or tap the icon to switch back to voice anytime.";

export function buildSummarySpeech(profile: ProfileData): string {
  const company =
    profile.companyName.trim() || "Not provided";
  return `Here's what I've got: Name ${profile.fullName}, Company ${company}, Trade ${profile.trade}, City ${profile.city}, Email ${profile.email}. Does this look right, or would you like to change something?`;
}

export function formatProfileValue(
  key: ProfileFieldKey,
  value: string
): string {
  if (key === "phone") {
    return value.trim() || "Not provided";
  }

  if (key === "companyName") {
    return value.trim() || "Not provided";
  }

  return value.trim() || "—";
}
