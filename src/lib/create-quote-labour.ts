/**
 * Create Quote labour — cost (employee hours × pay_rate) vs customer price.
 */

import type { Employee } from "@/types/employee";
import {
  labourMarginPercent,
  shouldWarnLabourMargin,
  type LabourBillingMode,
} from "@/types/labour-quoting";
import { createLabourItem, type LabourItem } from "@/types/quote";

export type EmployeeLabourHours = {
  employeeId: string;
  hours: number;
};

export type CreateQuoteLabourDraft = {
  billingMode: LabourBillingMode;
  hoursByEmployeeId: Record<string, number>;
  /** T&M: customer $/hour. Flat: ignored. */
  sellHourlyRate: number;
  /** Flat: customer total. T&M: ignored. */
  sellFlatAmount: number;
};

export type EmployeeLabourCostLine = {
  employeeId: string;
  fullName: string;
  hours: number;
  payRate: number;
  cost: number;
  /** Missing usable hourly pay_rate for cost. */
  missingRate: boolean;
};

export type CreateQuoteLabourSummary = {
  lines: EmployeeLabourCostLine[];
  totalHours: number;
  totalCost: number;
  charged: number;
  marginAmount: number;
  marginPercent: number;
  warn: boolean;
  missingRateNames: string[];
};

/** Hourly employees with a positive pay_rate can contribute to labour cost. */
export function employeeCostRate(employee: Employee): number | null {
  if (employee.pay_type !== "hourly") return null;
  const rate = Number(employee.pay_rate);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return rate;
}

export function summarizeCreateQuoteLabour(input: {
  employees: Employee[];
  hoursByEmployeeId: Record<string, number>;
  billingMode: LabourBillingMode;
  sellHourlyRate: number;
  sellFlatAmount: number;
  warnBelowPercent: number;
}): CreateQuoteLabourSummary {
  const lines: EmployeeLabourCostLine[] = [];
  const missingRateNames: string[] = [];
  let totalHours = 0;
  let totalCost = 0;

  for (const employee of input.employees) {
    const hours = Math.max(
      0,
      Number(input.hoursByEmployeeId[employee.id]) || 0
    );
    if (hours <= 0) continue;

    totalHours += hours;
    const rate = employeeCostRate(employee);
    if (rate == null) {
      missingRateNames.push(employee.full_name);
      lines.push({
        employeeId: employee.id,
        fullName: employee.full_name,
        hours,
        payRate: 0,
        cost: 0,
        missingRate: true,
      });
      continue;
    }

    const cost = roundMoney(hours * rate);
    totalCost += cost;
    lines.push({
      employeeId: employee.id,
      fullName: employee.full_name,
      hours,
      payRate: rate,
      cost,
      missingRate: false,
    });
  }

  totalCost = roundMoney(totalCost);
  totalHours = roundHours(totalHours);

  const charged =
    input.billingMode === "flat"
      ? roundMoney(Math.max(0, input.sellFlatAmount))
      : roundMoney(Math.max(0, totalHours * Math.max(0, input.sellHourlyRate)));

  const marginAmount = roundMoney(charged - totalCost);
  const marginPercent = labourMarginPercent(totalCost, charged);
  const warn =
    charged > 0 &&
    shouldWarnLabourMargin(marginPercent, input.warnBelowPercent);

  return {
    lines,
    totalHours,
    totalCost,
    charged,
    marginAmount,
    marginPercent,
    warn,
    missingRateNames,
  };
}

/** Customer-facing labour_items from sell price (never pay rates). */
export function buildCustomerLabourItems(input: {
  billingMode: LabourBillingMode;
  totalHours: number;
  sellHourlyRate: number;
  sellFlatAmount: number;
}): LabourItem[] {
  if (input.billingMode === "flat") {
    const amount = roundMoney(Math.max(0, input.sellFlatAmount));
    if (amount <= 0) return [];
    return [
      createLabourItem({
        description: "Labour",
        hours: 1,
        rate: amount,
      }),
    ];
  }

  const hours = roundHours(Math.max(0, input.totalHours));
  const rate = roundMoney(Math.max(0, input.sellHourlyRate));
  if (hours <= 0 || rate <= 0) return [];
  return [
    createLabourItem({
      description: "Labour",
      hours,
      rate,
    }),
  ];
}

export function buildLabourConfirmSpeech(summary: CreateQuoteLabourSummary): string {
  if (summary.lines.length === 0) {
    return "No labour hours assigned yet.";
  }

  const people = summary.lines
    .map((line) => {
      const hrs = formatHours(line.hours);
      return `${line.fullName} ${hrs} hour${line.hours === 1 ? "" : "s"}`;
    })
    .join(", ");

  const cost = formatCad(summary.totalCost);
  const charged = formatCad(summary.charged);
  const margin = formatCad(summary.marginAmount);
  const pct = formatPct(summary.marginPercent);

  if (summary.warn) {
    return (
      `${people}. Your labour cost is ${cost}, and you're only charging ${charged}. ` +
      `That's a ${pct} margin. Are you sure?`
    );
  }

  return (
    `${people}. Your labour cost is ${cost}, and you're charging ${charged} — ` +
    `that's ${margin} margin (${pct}). Want to go ahead?`
  );
}

/**
 * Parse spoken/typed labour assignment into hours by employee id.
 * Examples: "Reza 8 hours, Ali 12 hours" / "8 hours for Reza".
 */
export function parseLabourHoursFromText(
  text: string,
  employees: Employee[]
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!text.trim() || employees.length === 0) return result;

  const normalized = text
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();

  const byFirst = [...employees].sort(
    (a, b) => b.full_name.length - a.full_name.length
  );

  // "Name … N hour(s)" or "N hour(s) … Name"
  for (const employee of byFirst) {
    const name = escapeRegExp(employee.full_name.trim());
    if (!name) continue;
    const first = escapeRegExp(employee.full_name.trim().split(/\s+/)[0] ?? "");
    const nameAlt = first && first.toLowerCase() !== name.toLowerCase()
      ? `|${first}`
      : "";
    const nameGroup = `(?:${name}${nameAlt})`;

    const patterns = [
      new RegExp(
        `${nameGroup}[^\\d]{0,24}(\\d+(?:\\.\\d+)?)\\s*(?:hours?|hrs?|h)\\b`,
        "i"
      ),
      new RegExp(
        `(\\d+(?:\\.\\d+)?)\\s*(?:hours?|hrs?|h)\\b[^\\d]{0,24}${nameGroup}`,
        "i"
      ),
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (!match) continue;
      const hours = Number.parseFloat(match[1] ?? "");
      if (!Number.isFinite(hours) || hours < 0) continue;
      result[employee.id] = roundHours(hours);
      break;
    }
  }

  return result;
}

/**
 * Parse sell price from speech/text.
 * "sell it at $120 an hour" → T&M rate
 * "sell it for $800" / "flat $800" → flat amount
 */
export function parseLabourSellFromText(text: string): {
  billingMode?: LabourBillingMode;
  sellHourlyRate?: number;
  sellFlatAmount?: number;
} {
  const normalized = text.replace(/,/g, "").replace(/\s+/g, " ").trim();
  if (!normalized) return {};

  const hourly = normalized.match(
    /(?:sell(?:\s+it)?(?:\s+(?:at|for))?|charge(?:\s+(?:at|for))?|at|@)\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:an?\s+hour|\/\s*h(?:ou)?r?|per\s+hour|hourly)\b/i
  );
  if (hourly) {
    const rate = Number.parseFloat(hourly[1] ?? "");
    if (Number.isFinite(rate) && rate >= 0) {
      return { billingMode: "time_and_material", sellHourlyRate: rate };
    }
  }

  const flatExplicit = normalized.match(
    /(?:sell(?:\s+it)?(?:\s+for)?|charge(?:\s+for)?|flat(?:\s+(?:rate|amount|price))?|agreed(?:\s+amount)?)\s*\$?\s*(\d+(?:\.\d+)?)\b/i
  );
  if (flatExplicit) {
    const amount = Number.parseFloat(flatExplicit[1] ?? "");
    if (Number.isFinite(amount) && amount >= 0) {
      // Prefer hourly if the same phrase also said "hour"
      if (/\bhour|hourly|\/\s*h\b/i.test(flatExplicit[0])) {
        return { billingMode: "time_and_material", sellHourlyRate: amount };
      }
      return { billingMode: "flat", sellFlatAmount: amount };
    }
  }

  const bareHourly = normalized.match(
    /\$?\s*(\d+(?:\.\d+)?)\s*(?:an?\s+hour|\/\s*h(?:ou)?r?|per\s+hour|hourly)\b/i
  );
  if (bareHourly) {
    const rate = Number.parseFloat(bareHourly[1] ?? "");
    if (Number.isFinite(rate) && rate >= 0) {
      return { billingMode: "time_and_material", sellHourlyRate: rate };
    }
  }

  return {};
}

export function formatCad(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(roundMoney(amount));
}

export function formatPct(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : String(roundHours(hours));
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function roundHours(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
