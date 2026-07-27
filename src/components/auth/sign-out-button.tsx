"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLogOut } from "@/components/dashboard/icons";
import { createClient } from "@/lib/supabase";

interface SignOutButtonProps {
  className?: string;
  iconOnly?: boolean;
}

export function SignOutButton({ className, iconOnly = false }: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      aria-label={iconOnly ? "Sign out" : undefined}
      title={iconOnly ? "Sign out" : undefined}
      className={
        className ??
        "rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {loading ? (
        iconOnly ? (
          <span className="text-xs">...</span>
        ) : (
          "Signing out..."
        )
      ) : iconOnly ? (
        <IconLogOut className="h-4 w-4" />
      ) : (
        "Sign Out"
      )}
    </button>
  );
}
