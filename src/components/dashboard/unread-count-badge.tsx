"use client";

export function UnreadCountBadge({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={`flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ${className}`}
      aria-label={`${count} unread notifications`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
