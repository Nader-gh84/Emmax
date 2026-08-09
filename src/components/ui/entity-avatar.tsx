"use client";

import { useEffect, useMemo, useState } from "react";
import type { CustomerGender } from "@/types/customer";

const AVATAR_COLORS = [
  "bg-sky-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-cyan-700",
  "bg-violet-600",
  "bg-emerald-700",
];

export type EntityAvatarSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<EntityAvatarSize, string> = {
  sm: "h-10 w-10 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-xl",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0]?.slice(0, 2).toUpperCase() || "?";
}

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[hash] ?? AVATAR_COLORS[0];
}

function GenderIllustration({
  gender,
  className,
}: {
  gender: "male" | "female";
  className?: string;
}) {
  if (gender === "female") {
    return (
      <svg
        className={className}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="32" cy="32" r="32" fill="#F9A8D4" fillOpacity="0.22" />
        <circle cx="32" cy="22" r="10" fill="#FBCFE8" />
        <path
          d="M16 52c2.5-10 9-16 16-16s13.5 6 16 16"
          fill="#F9A8D4"
        />
        <path
          d="M22 18c2-6 6-9 10-9s8 3 10 9"
          stroke="#F472B6"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="32" fill="#7DD3FC" fillOpacity="0.22" />
      <circle cx="32" cy="22" r="10" fill="#BAE6FD" />
      <path
        d="M16 52c2.5-10 9-16 16-16s13.5 6 16 16"
        fill="#38BDF8"
      />
      <path
        d="M22 16h20"
        stroke="#0EA5E9"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Display priority:
 * 1) Uploaded photo/logo (resolved imageUrl)
 * 2) Gender illustration (customers, male/female only)
 * 3) Initials-based colored circle
 */
export function EntityAvatar({
  name,
  size = "md",
  imageUrl,
  imagePath,
  resolveImageUrl,
  gender,
  className = "",
}: {
  name: string;
  size?: EntityAvatarSize;
  /** Pre-resolved signed URL or public URL. */
  imageUrl?: string | null;
  /** Storage path — resolved via resolveImageUrl when imageUrl is not provided. */
  imagePath?: string | null;
  resolveImageUrl?: (path: string) => Promise<string | null>;
  gender?: CustomerGender | null;
  className?: string;
}) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(
    imageUrl ?? null
  );
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    if (imageUrl) {
      setResolvedUrl(imageUrl);
      return;
    }

    const path = imagePath?.trim();
    if (!path || !resolveImageUrl) {
      setResolvedUrl(null);
      return;
    }

    let cancelled = false;
    void resolveImageUrl(path).then((url) => {
      if (!cancelled) setResolvedUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl, imagePath, resolveImageUrl]);

  const initials = useMemo(() => getInitials(name), [name]);
  const colorClass = useMemo(() => avatarColor(name), [name]);
  const sizeClass = SIZE_CLASS[size];
  const showPhoto = Boolean(resolvedUrl) && !imageFailed;
  const showGender =
    !showPhoto && (gender === "male" || gender === "female");

  if (showPhoto && resolvedUrl) {
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  if (showGender && gender) {
    return (
      <div
        className={`${sizeClass} shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 ${className}`}
        aria-hidden="true"
      >
        <GenderIllustration gender={gender} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${sizeClass} ${colorClass} ${className}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}
