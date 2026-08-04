export const QUOTE_TEMPLATE_IDS = [
  "classic_blue",
  "bold_green",
  "modern_teal",
] as const;

export type QuoteTemplateId = (typeof QUOTE_TEMPLATE_IDS)[number];

export const DEFAULT_QUOTE_TEMPLATE: QuoteTemplateId = "classic_blue";

export const QUOTE_TEMPLATE_META: Record<
  QuoteTemplateId,
  { label: string; accent: string; description: string }
> = {
  classic_blue: {
    label: "Classic Blue",
    accent: "#2563EB",
    description: "Boxed sections, blue table header, navy accent bar",
  },
  bold_green: {
    label: "Bold Green",
    accent: "#16A34A",
    description: "Angled green header block and footer band",
  },
  modern_teal: {
    label: "Modern Teal",
    accent: "#0D9488",
    description: "Amount due callout, teal accents, thank-you banner",
  },
};

export function isQuoteTemplateId(value: unknown): value is QuoteTemplateId {
  return (
    typeof value === "string" &&
    (QUOTE_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export function normalizeQuoteTemplate(value: unknown): QuoteTemplateId {
  return isQuoteTemplateId(value) ? value : DEFAULT_QUOTE_TEMPLATE;
}
