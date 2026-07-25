import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePdfDocument, QuotePdfData } from "@/lib/pdf/quote-pdf";

export async function generateQuotePdfBuffer(
  data: QuotePdfData
): Promise<Buffer> {
  return renderToBuffer(<QuotePdfDocument data={data} />);
}
