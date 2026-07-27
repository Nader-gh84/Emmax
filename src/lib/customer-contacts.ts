import type { CustomerFormData } from "@/types/customer";

interface ContactInfo {
  name?: string[];
  email?: string[];
  tel?: string[];
  address?: string[];
}

interface ContactsManager {
  select(
    properties: string[],
    options?: { multiple?: boolean }
  ): Promise<ContactInfo[]>;
}

interface NavigatorWithContacts extends Navigator {
  contacts?: ContactsManager;
}

export function isContactPickerSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "contacts" in navigator &&
    "ContactsManager" in window
  );
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();

  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export async function pickContactForForm(): Promise<CustomerFormData | null> {
  if (!isContactPickerSupported()) {
    return null;
  }

  const navigatorWithContacts = navigator as NavigatorWithContacts;

  if (!navigatorWithContacts.contacts) {
    return null;
  }

  const contacts = await navigatorWithContacts.contacts.select(
    ["name", "email", "tel", "address"],
    { multiple: false }
  );

  if (!contacts.length) {
    return null;
  }

  const contact = contacts[0];
  const { firstName, lastName } = splitFullName(contact.name?.[0] ?? "");

  return {
    first_name: firstName,
    last_name: lastName,
    email: contact.email?.[0] ?? "",
    phone: contact.tel?.[0] ?? "",
    address: contact.address?.[0] ?? "",
    notes: "",
  };
}
