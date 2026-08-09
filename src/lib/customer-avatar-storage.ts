import { createClient } from "@/lib/supabase";

export const CUSTOMER_AVATARS_BUCKET = "customer-avatars";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export function isCustomerAvatarImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
}

export function validateCustomerAvatarFile(file: File): string | null {
  if (!isCustomerAvatarImage(file)) {
    return "Please choose an image file for the photo.";
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return "Photo must be 2 MB or smaller.";
  }
  return null;
}

/** Upload a customer photo. Returns storage path for customers.avatar_url. */
export async function uploadCustomerAvatar(params: {
  userId: string;
  customerId: string;
  file: File;
}): Promise<{ path: string } | { error: string }> {
  const validationError = validateCustomerAvatarFile(params.file);
  if (validationError) return { error: validationError };

  const supabase = createClient();
  const safeName =
    params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "avatar.jpg";
  const path = `${params.userId}/${params.customerId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(CUSTOMER_AVATARS_BUCKET)
    .upload(path, params.file, {
      contentType: params.file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    const detail = error.message?.trim() || "unknown error";
    const hint =
      detail.toLowerCase().includes("bucket") ||
      detail.toLowerCase().includes("not found")
        ? " Create the customer-avatars bucket (run migration 040)."
        : detail.toLowerCase().includes("row-level security") ||
            detail.toLowerCase().includes("policy") ||
            detail.toLowerCase().includes("unauthorized") ||
            detail.toLowerCase().includes("permission")
          ? " Check customer-avatars storage RLS policies (migration 040)."
          : "";
    return { error: `Failed to upload photo: ${detail}.${hint}` };
  }

  return { path };
}

export async function createCustomerAvatarSignedUrl(
  avatarPath: string
): Promise<string | null> {
  const path = avatarPath.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(CUSTOMER_AVATARS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("[createCustomerAvatarSignedUrl]", error?.message);
    return null;
  }

  return data.signedUrl;
}

export async function deleteCustomerAvatarFile(
  avatarPath: string | null | undefined
): Promise<void> {
  const path = avatarPath?.trim();
  if (!path || /^https?:\/\//i.test(path)) return;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(CUSTOMER_AVATARS_BUCKET)
    .remove([path]);

  if (error) {
    console.error("[deleteCustomerAvatarFile]", error.message);
  }
}
