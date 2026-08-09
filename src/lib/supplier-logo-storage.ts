import { createClient } from "@/lib/supabase";

export const SUPPLIER_LOGOS_BUCKET = "supplier-logos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

export function isSupplierLogoImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
}

export function validateSupplierLogoFile(file: File): string | null {
  if (!isSupplierLogoImage(file)) {
    return "Please choose an image file for the logo.";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be 2 MB or smaller.";
  }
  return null;
}

/** Upload a supplier logo. Returns storage path for suppliers.logo_url. */
export async function uploadSupplierLogo(params: {
  userId: string;
  supplierId: string;
  file: File;
}): Promise<{ path: string } | { error: string }> {
  const validationError = validateSupplierLogoFile(params.file);
  if (validationError) return { error: validationError };

  const supabase = createClient();
  const safeName =
    params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "logo.jpg";
  const path = `${params.userId}/${params.supplierId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(SUPPLIER_LOGOS_BUCKET)
    .upload(path, params.file, {
      contentType: params.file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    const detail = error.message?.trim() || "unknown error";
    const hint =
      detail.toLowerCase().includes("bucket") ||
      detail.toLowerCase().includes("not found")
        ? " Create the supplier-logos bucket (run migration 040)."
        : detail.toLowerCase().includes("row-level security") ||
            detail.toLowerCase().includes("policy") ||
            detail.toLowerCase().includes("unauthorized") ||
            detail.toLowerCase().includes("permission")
          ? " Check supplier-logos storage RLS policies (migration 040)."
          : "";
    return { error: `Failed to upload logo: ${detail}.${hint}` };
  }

  return { path };
}

export async function createSupplierLogoSignedUrl(
  logoPath: string
): Promise<string | null> {
  const path = logoPath.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(SUPPLIER_LOGOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[createSupplierLogoSignedUrl]", error?.message);
    return null;
  }

  return data.signedUrl;
}

export async function deleteSupplierLogoFile(
  logoPath: string | null | undefined
): Promise<void> {
  const path = logoPath?.trim();
  if (!path || /^https?:\/\//i.test(path)) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(SUPPLIER_LOGOS_BUCKET)
    .remove([path]);

  if (error) {
    console.error("[deleteSupplierLogoFile]", error.message);
  }
}
