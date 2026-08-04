import { createClient } from "@/lib/supabase";

const QUOTE_PDFS_BUCKET = "quote-pdfs";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Create a temporary signed URL for a private quote-pdfs object.
 * `pdfPath` is the storage object path (e.g. `{userId}/{quoteId}.pdf`),
 * not a public URL.
 */
export async function createQuotePdfSignedUrl(
  pdfPath: string
): Promise<string> {
  const path = pdfPath.trim();
  if (!path) {
    throw new Error("No PDF path stored for this quote.");
  }

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(QUOTE_PDFS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    const detail = error?.message?.trim() || "unknown error";
    const hint =
      detail.toLowerCase().includes("bucket") ||
      detail.toLowerCase().includes("not found")
        ? " Create the quote-pdfs bucket (run migration 009 or 026)."
        : detail.toLowerCase().includes("row-level security") ||
            detail.toLowerCase().includes("policy") ||
            detail.toLowerCase().includes("unauthorized") ||
            detail.toLowerCase().includes("permission")
          ? " Check quote-pdfs storage RLS policies (migration 009/026)."
          : "";
    throw new Error(`Failed to open quote PDF: ${detail}.${hint}`);
  }

  return data.signedUrl;
}

/** Download the stored PDF bytes via a signed URL. */
export async function downloadQuotePdfBlob(pdfPath: string): Promise<Blob> {
  const signedUrl = await createQuotePdfSignedUrl(pdfPath);
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error("Failed to download quote PDF from storage.");
  }
  return response.blob();
}
