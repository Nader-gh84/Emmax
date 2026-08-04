import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { QuotePdfData } from "@/lib/pdf/quote-pdf-types";
import { normalizeQuoteTemplate } from "@/lib/pdf/quote-templates";
import {
  QuotePdfBoldGreen,
  QuotePdfClassicBlue,
  QuotePdfModernTeal,
} from "@/lib/pdf/templates";

export async function generateQuotePdfBuffer(
  data: QuotePdfData
): Promise<Buffer> {
  const template = normalizeQuoteTemplate(
    data.template ?? data.company?.quoteTemplate
  );

  const document =
    template === "bold_green" ? (
      <QuotePdfBoldGreen data={data} />
    ) : template === "modern_teal" ? (
      <QuotePdfModernTeal data={data} />
    ) : (
      <QuotePdfClassicBlue data={data} />
    );

  return renderToBuffer(document);
}
