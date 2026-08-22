/**
 * Shared types for Create Quote labour (cost vs price) and estimate vs actual hours.
 * Schema: migration 043_labour_quote_estimates.sql
 */

/** Planned hours from Create Quote vs hours logged on the job. */
export type TimeEntrySource = "quote_estimate" | "actual";

/** How labour is presented on the customer quote (not how cost is tracked). */
export type LabourBillingMode = "time_and_material" | "flat";

/** Default: warn only when margin is zero or negative. */
export const DEFAULT_LABOUR_MARGIN_WARN_PERCENT = 0;

export function isTimeEntrySource(value: string): value is TimeEntrySource {
  return value === "quote_estimate" || value === "actual";
}

export function normalizeTimeEntrySource(value: unknown): TimeEntrySource {
  return value === "quote_estimate" ? "quote_estimate" : "actual";
}

export function isLabourBillingMode(value: string): value is LabourBillingMode {
  return value === "time_and_material" || value === "flat";
}

export function normalizeLabourBillingMode(
  value: unknown
): LabourBillingMode | null {
  if (typeof value !== "string") return null;
  return isLabourBillingMode(value) ? value : null;
}

/** Clamp to 0–100; invalid → default (0). */
export function normalizeLabourMarginWarnPercent(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_LABOUR_MARGIN_WARN_PERCENT;
  return Math.min(100, Math.max(0, n));
}

/**
 * Margin % from cost and charged price.
 * When charged is 0: 0% if cost is also 0, otherwise -100% (all cost, no revenue).
 */
export function labourMarginPercent(cost: number, charged: number): number {
  const c = Number.isFinite(cost) ? cost : 0;
  const p = Number.isFinite(charged) ? charged : 0;
  if (p <= 0) return c <= 0 ? 0 : -100;
  return ((p - c) / p) * 100;
}

/** True when margin is at or below the configured warn threshold. */
export function shouldWarnLabourMargin(
  marginPercent: number,
  warnBelowPercent: number
): boolean {
  const threshold = normalizeLabourMarginWarnPercent(warnBelowPercent);
  return marginPercent <= threshold;
}
