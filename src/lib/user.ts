import type { User } from "@supabase/supabase-js";

export function getFirstName(user: User): string {
  const metadata = user.user_metadata;

  if (typeof metadata?.full_name === "string" && metadata.full_name.trim()) {
    return metadata.full_name.trim().split(/\s+/)[0];
  }

  if (typeof metadata?.name === "string" && metadata.name.trim()) {
    return metadata.name.trim().split(/\s+/)[0];
  }

  if (user.email) {
    const localPart = user.email.split("@")[0];
    const segment = localPart.split(/[._-]/)[0];
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }

  return "there";
}
