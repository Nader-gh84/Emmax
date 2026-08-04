import { createClient } from "@/lib/supabase";

export const EXPENSE_RECEIPTS_BUCKET = "expense-receipts";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB (matches bucket limit)

export function isExpenseReceiptImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  // Some mobile cameras omit mime; allow by extension fallback.
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
}

export function validateExpenseReceiptFile(file: File): string | null {
  if (!isExpenseReceiptImage(file)) {
    return "Please choose an image file for the receipt.";
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return "Receipt image must be 10 MB or smaller.";
  }
  return null;
}

/**
 * Upload a receipt image to the private expense-receipts bucket.
 * Returns the storage object path stored in project_expenses.receipt_url.
 */
export async function uploadExpenseReceipt(params: {
  userId: string;
  projectId: string;
  file: File;
}): Promise<{ path: string } | { error: string }> {
  const validationError = validateExpenseReceiptFile(params.file);
  if (validationError) return { error: validationError };

  const supabase = createClient();
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "receipt.jpg";
  const path = `${params.userId}/${params.projectId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(EXPENSE_RECEIPTS_BUCKET)
    .upload(path, params.file, {
      contentType: params.file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    const detail = error.message?.trim() || "unknown error";
    const hint =
      detail.toLowerCase().includes("bucket") ||
      detail.toLowerCase().includes("not found")
        ? " Create the expense-receipts bucket (run migration 032)."
        : detail.toLowerCase().includes("row-level security") ||
            detail.toLowerCase().includes("policy") ||
            detail.toLowerCase().includes("unauthorized") ||
            detail.toLowerCase().includes("permission")
          ? " Check expense-receipts storage RLS policies (migration 032)."
          : "";
    return { error: `Failed to upload receipt: ${detail}.${hint}` };
  }

  return { path };
}

/** Create a temporary signed URL for a private expense receipt object. */
export async function createExpenseReceiptSignedUrl(
  receiptPath: string
): Promise<string | null> {
  const path = receiptPath.trim();
  if (!path) return null;

  // Already a full URL (legacy / accidental) — use as-is.
  if (/^https?:\/\//i.test(path)) return path;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(EXPENSE_RECEIPTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[createExpenseReceiptSignedUrl]", error?.message);
    return null;
  }

  return data.signedUrl;
}

/** Best-effort remove of a receipt object when an expense is deleted. */
export async function deleteExpenseReceipt(
  receiptPath: string | null | undefined
): Promise<void> {
  const path = receiptPath?.trim();
  if (!path || /^https?:\/\//i.test(path)) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(EXPENSE_RECEIPTS_BUCKET)
    .remove([path]);

  if (error) {
    console.error("[deleteExpenseReceipt]", error.message);
  }
}
