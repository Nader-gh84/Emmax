import { getBuildVersionLabel } from "@/lib/build-version";

export function BuildVersionIndicator() {
  const label = getBuildVersionLabel();

  return (
    <span
      className="max-w-[9rem] truncate text-[10px] leading-tight text-slate-500"
      title={label}
    >
      {label}
    </span>
  );
}
