import type { QuoteEmailData } from "@/lib/email/quote-email";
import type { CompanyBrandingForPdf } from "@/lib/pdf/quote-pdf-shared";
import type { QuoteTemplateId } from "@/lib/pdf/quote-templates";

export interface QuotePdfData extends QuoteEmailData {
  customerPhone?: string;
  company?: Partial<CompanyBrandingForPdf>;
  template?: QuoteTemplateId;
}
