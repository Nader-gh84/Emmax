"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createClient } from "@/lib/supabase";
import { getUserDisplayName, getUserInitials } from "@/lib/user-display";

interface UserMenuProps {
  /** Where the dropdown opens relative to the avatar. */
  menuAlign?: "left" | "right";
  /** Visual density — sidebar shows name beside avatar when closed. */
  variant?: "sidebar" | "compact";
}

export function UserMenu({
  menuAlign = "left",
  variant = "compact",
}: UserMenuProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setIsLoading(false);
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("business_profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      const metaName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : "";

      setFullName(profile?.full_name?.trim() || metaName.trim() || "");
      setIsLoading(false);
    }

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const initials = getUserInitials(fullName, email);
  const displayName = getUserDisplayName(fullName, email);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open user menu"
        className={`flex items-center gap-3 rounded-xl transition hover:bg-white/5 ${
          variant === "sidebar"
            ? "w-full min-h-[44px] px-2 py-2"
            : "h-9 w-9 justify-center"
        }`}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-navy text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {isLoading ? "…" : initials}
        </span>
        {variant === "sidebar" && (
          <span className="min-w-0 flex-1 text-left">
            <span className="block truncate text-sm font-medium text-white">
              {isLoading ? "Loading…" : displayName}
            </span>
            <span className="block truncate text-xs text-slate-500">
              Account
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute z-50 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#14263D] shadow-xl ${
            menuAlign === "right" ? "right-0" : "left-0"
          } ${
            variant === "sidebar"
              ? "bottom-full mb-2"
              : "top-full mt-2"
          }`}
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">
              {displayName || "Account"}
            </p>
            {email ? (
              <p className="mt-0.5 truncate text-xs text-slate-400">{email}</p>
            ) : null}
          </div>

          <div className="p-1.5">
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex min-h-[40px] items-center rounded-lg px-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Settings
            </Link>

            <SignOutButton
              className="mt-0.5 flex min-h-[40px] w-full items-center rounded-lg px-3 text-left text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>
      )}
    </div>
  );
}
