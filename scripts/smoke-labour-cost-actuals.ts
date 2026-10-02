/**
 * Labour cost: actual hours win over quote estimates; never sum both.
 * Run: npx tsx scripts/smoke-labour-cost-actuals.ts
 */
import {
  computeFinancialSummary,
  selectLabourCostTimeEntries,
} from "../src/types/project-operations";

const estimates = [
  {
    hours: 10,
    entry_source: "quote_estimate" as const,
    payment_status: "unpaid" as const,
    pay_rate_snapshot: 40,
    employees: { pay_rate: 40, pay_type: "hourly" },
  },
];

const actuals = [
  {
    hours: 4,
    entry_source: "actual" as const,
    payment_status: "unpaid" as const,
    pay_rate_snapshot: 40,
    employees: { pay_rate: 40, pay_type: "hourly" },
  },
];

const mixed = selectLabourCostTimeEntries([...estimates, ...actuals]);
if (mixed.length !== 1 || mixed[0]?.entry_source !== "actual") {
  throw new Error("Expected actuals only when both sources exist");
}

const estimateOnly = selectLabourCostTimeEntries(estimates);
if (estimateOnly.length !== 1) {
  throw new Error("Expected quote estimates when no actuals exist");
}

const mixedSummary = computeFinancialSummary({
  quoteAmount: 1000,
  payments: [],
  expenses: [],
  materialOrders: [],
  timeEntries: [...estimates, ...actuals],
  changeOrders: [],
});

if (Math.abs(mixedSummary.labourCost - 160) > 0.001) {
  throw new Error(
    `Expected labour cost 4h × $40 = $160, got ${mixedSummary.labourCost}`
  );
}

const estimateSummary = computeFinancialSummary({
  quoteAmount: 1000,
  payments: [],
  expenses: [],
  materialOrders: [],
  timeEntries: estimates,
  changeOrders: [],
});

if (Math.abs(estimateSummary.labourCost - 400) > 0.001) {
  throw new Error(
    `Expected estimate labour 10h × $40 = $400, got ${estimateSummary.labourCost}`
  );
}

const snapshotWins = computeFinancialSummary({
  quoteAmount: 0,
  payments: [],
  expenses: [],
  materialOrders: [],
  timeEntries: [
    {
      hours: 2,
      entry_source: "actual",
      payment_status: "unpaid",
      pay_rate_snapshot: 50,
      employees: { pay_rate: 99, pay_type: "hourly" },
    },
  ],
});

if (Math.abs(snapshotWins.labourCost - 100) > 0.001) {
  throw new Error(
    `Expected snapshot rate 50 × 2 = 100, got ${snapshotWins.labourCost}`
  );
}

console.log("smoke-labour-cost-actuals: OK");
