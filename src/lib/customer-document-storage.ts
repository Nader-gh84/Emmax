import { createClient } from "@/lib/supabase";

export const CUSTOMER_DOCUMENTS_BUCKET = "customer-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10 MB (matches bucket limit)

const ALLOWED_MIME_PREFIXES = ["image/"] as const;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export function isCustomerDocumentFile(file: File): boolean {
  if (ALLOWED_MIME_TYPES.has(file.type)) return true;
  if (ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
    return true;
  }
  // Some devices omit mime; allow by extension fallback.
  return /\.(pdf|docx?|xlsx?|txt|jpe?g|png|gif|webp|heic|heif)$/i.test(
    file.name
  );
}

export function validateCustomerDocumentFile(file: File): string | null {
  if (!isCustomerDocumentFile(file)) {
    return "Please choose a PDF, image, Word, Excel, or text file.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return "Document must be 10 MB or smaller.";
  }
  return null;
}

/**
 * Upload a file to the private customer-documents bucket.
 * Returns the storage object path stored in customer_documents.file_path.
 */
export async function uploadCustomerDocument(params: {
  userId: string;
  customerId: string;
  file: File;
}): Promise<{ path: string } | { error: string }> {
  const validationError = validateCustomerDocumentFile(params.file);
  if (validationError) return { error: validationError };

  const supabase = createClient();
  const safeName =
    params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "document";
  const path = `${params.userId}/${params.customerId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .upload(path, params.file, {
      contentType: params.file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    const detail = error.message?.trim() || "unknown error";
    const hint =
      detail.toLowerCase().includes("bucket") ||
      detail.toLowerCase().includes("not found")
        ? " Create the customer-documents bucket (run migration 039)."
        : detail.toLowerCase().includes("row-level security") ||
            detail.toLowerCase().includes("policy") ||
            detail.toLowerCase().includes("unauthorized") ||
            detail.toLowerCase().includes("permission")
          ? " Check customer-documents storage RLS policies (migration 039)."
          : "";
    return { error: `Failed to upload document: ${detail}.${hint}` };
  }

  return { path };
}

/** Create a temporary signed URL for a private customer document object. */
export async function createCustomerDocumentSignedUrl(
  filePath: string
): Promise<string | null> {
  const path = filePath.trim();
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) return path;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[createCustomerDocumentSignedUrl]", error?.message);
    return null;
  }

  return data.signedUrl;
}

/** Best-effort remove of a document object when a row is deleted. */
export async function deleteCustomerDocumentFile(
  filePath: string | null | undefined
): Promise<void> {
  const path = filePath?.trim();
  if (!path || /^https?:\/\//i.test(path)) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(CUSTOMER_DOCUMENTS_BUCKET)
    .remove([path]);

  if (error) {
    console.error("[deleteCustomerDocumentFile]", error.message);
  }
}
