/**
 * Static audit + regression checks for Em Call read tools.
 * Catches schema mismatches (e.g. quotes.total) before they become
 * spoken "couldn't find financial details" failures.
 *
 * Run: npx tsx scripts/smoke-em-call-read-tools.ts
 */
import fs from "node:fs";
import path from "node:path";
import { computeFinancialSummary } from "../src/types/project-operations";
import { EM_CALL_READ_TOOL_NAMES } from "../src/lib/em-call/tools/definitions";
import {
  buildCustomerProjectFinancials,
  rollupCustomerOutstanding,
} from "../src/lib/customer-financials";

const root = path.join(__dirname, "..");
const executeReadsPath = path.join(
  root,
  "src/lib/em-call/tools/execute-reads.ts"
);
const source = fs.readFileSync(executeReadsPath, "utf8");

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function check(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

// --- Schema footguns ---
check(
  "projects select must not request quotes.total",
  !/quotes\([^)]*\btotal\b/.test(source),
  "quotes.total is not a column; use grand_total"
);
check(
  "projects select uses quotes.grand_total",
  /quotes\([^)]*grand_total/.test(source),
  "assertOwnedProject / financial path"
);
check(
  "fallback value uses quotes?.grand_total not quotes?.total",
  /quotes\?\.grand_total/.test(source) && !/quotes\?\.total\b/.test(source),
  ""
);
check(
  "assertOwnedProject surfaces Failed to load project errors",
  source.includes("Failed to load project:"),
  "do not swallow PostgREST errors as Project not found"
);
check(
  "loadProjectFinancialInputs returns ok/error union",
  source.includes("ok: false as const") &&
    source.includes("Failed to load project payments:"),
  "query errors must propagate"
);

// --- Tool inventory ---
const implemented = [...EM_CALL_READ_TOOL_NAMES];
const requestedButMissing = [
  "get_employee",
  "search_tasks",
  "get_cash_flow_snapshot",
];

console.log("\nImplemented read tools:");
for (const name of implemented) console.log(`  ✓ ${name}`);

console.log("\nRequested in audit but NOT implemented yet:");
for (const name of requestedButMissing) console.log(`  ✗ ${name}`);

check(
  "core Chunk-2 read tools are registered",
  [
    "resolve_entity",
    "get_today_agenda",
    "list_projects",
    "get_project",
    "get_customer",
    "get_supplier",
    "get_financial_summary",
  ].every((n) => implemented.includes(n as (typeof implemented)[number])),
  implemented.join(", ")
);

// --- Kristina kitchen financials (user-verified UI numbers) ---
// Contract $8,324.09 − Total Costs $4,890 → Gross Profit $3,434.09
// Payments $500 → Outstanding $7,824.09
const projectId = "cf3f9ff6-5956-4e95-aca5-e318362d211b";
const summary = computeFinancialSummary({
  quoteAmount: 8324.09,
  depositAmount: 0,
  payments: [
    {
      payment_type: "customer_payment",
      amount: 500,
    },
  ],
  expenses: [
    {
      amount: 4890,
      billing_status: "company_cost",
      payment_status: "unpaid",
      expense_kind: "extra_purchase",
    },
  ],
  materialOrders: [],
  timeEntries: [],
  changeOrders: [],
});

check(
  "project gross profit matches UI ($3,434)",
  Math.round(summary.grossProfit) === 3434,
  `grossProfit=${summary.grossProfit} totalCost=${summary.totalProjectCost}`
);
check(
  "project outstanding matches UI ($7,824)",
  Math.round(summary.outstandingCustomerBalance) === 7824,
  `outstanding=${summary.outstandingCustomerBalance}`
);

const customerRows = buildCustomerProjectFinancials({
  projects: [
    {
      id: projectId,
      user_id: "u",
      customer_id: "3be38bbe-b54d-43bd-a407-abf939c82402",
      quote_id: null,
      project_name: "Kristina Lambert ( kitchen Renovation )",
      value: 8324.09,
      status: "in_progress",
      start_date: "2025-01-01",
      end_date: null,
      materials: null,
      labour_items: null,
      notes: null,
      project_type: null,
      project_manager: null,
      address: null,
      deposit_amount: 0,
      created_at: "",
      updated_at: "",
    },
  ],
  payments: [
    {
      id: "pay1",
      user_id: "u",
      project_id: projectId,
      payment_type: "customer_payment",
      amount: 500,
      payment_date: "2025-06-01",
      notes: null,
      created_at: "",
    },
  ],
  expenses: [
    {
      id: "exp1",
      user_id: "u",
      project_id: projectId,
      expense_date: "2025-06-01",
      store_name: "Store",
      description: "Materials",
      amount: 4890,
      receipt_url: null,
      billing_status: "company_cost",
      payment_status: "unpaid",
      expense_kind: "extra_purchase",
      created_at: "",
    },
  ],
  materialOrders: [],
  timeEntries: [],
  changeOrders: [],
});

const outstanding = rollupCustomerOutstanding(customerRows);
check(
  "customer rollup outstanding matches UI ($7,824)",
  outstanding != null && Math.round(outstanding.totalOutstanding) === 7824,
  JSON.stringify(outstanding)
);
check(
  "customer/project financials share computeFinancialSummary",
  Math.round(customerRows[0]!.grossProfit) === Math.round(summary.grossProfit),
  `customer=${customerRows[0]!.grossProfit} project=${summary.grossProfit}`
);

// --- Scope coverage in get_financial_summary ---
check(
  "get_financial_summary handles customer scope",
  source.includes('scope === "customer"'),
  ""
);
check(
  "get_financial_summary handles project scope",
  source.includes('scope === "project"'),
  ""
);
check(
  "get_financial_summary handles supplier scope",
  source.includes('scope === "supplier"'),
  ""
);
check(
  "get_financial_summary handles portfolio scope",
  source.includes('scope === "portfolio"'),
  ""
);
check(
  "get_financial_summary accepts project_id alias",
  source.includes("resolveScopedId") && source.includes("args.project_id"),
  "models often pass project_id instead of id"
);

const failed = checks.filter((c) => !c.ok).length;

console.log(`\n--- Audit summary ---`);
console.log(`Checks: ${checks.length - failed}/${checks.length} passed`);
console.log(`
Read-tool status (code audit; live DB not available in this agent env):
  resolve_entity          READY (shared fuzzy matcher)
  get_today_agenda        READY (queries schedule_items/tasks/material_orders/notifications)
  list_projects           READY
  get_project             FIXED (was broken by quotes.total → now grand_total + real errors)
  get_customer            READY (uses Customer Detail rollup)
  get_supplier            READY (supplier accounting helpers + error surfacing)
  get_financial_summary
    customer              READY (Customer Detail rollup)
    project               FIXED (same quotes.total bug; now computeFinancialSummary)
    supplier              READY (delegates to get_supplier)
    portfolio             FIXED (depends on project loader)
  get_employee            NOT IMPLEMENTED
  search_tasks            NOT IMPLEMENTED
  get_cash_flow_snapshot  NOT IMPLEMENTED
`);

if (failed > 0) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}

console.log("All checks passed.");
