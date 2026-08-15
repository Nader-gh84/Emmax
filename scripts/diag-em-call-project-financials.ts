/**
 * Live diagnostic: Em Call get_financial_summary(scope=project) vs Project Detail.
 *
 * Does NOT guess a fix — prints the raw PostgREST error for every query the
 * Em Call project-financial path runs, then the Project Detail path for comparison.
 *
 * Setup (from repo root, with your real .env.local):
 *   1. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   2. Prefer one of:
 *        SUPABASE_SERVICE_ROLE_KEY=...          (bypasses RLS; easiest)
 *      or:
 *        DIAG_EMAIL=you@example.com
 *        DIAG_PASSWORD=your-login-password     (uses the same auth as the app)
 *
 * Run:
 *   npx tsx scripts/diag-em-call-project-financials.ts
 *
 * Optional override:
 *   PROJECT_ID=cf3f9ff6-5956-4e95-aca5-e318362d211b npx tsx scripts/diag-em-call-project-financials.ts
 *
 * Paste the FULL stdout back into the Cursor agent chat (especially any
 * block marked FAIL / PostgREST).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { computeFinancialSummary } from "../src/types/project-operations";

const DEFAULT_PROJECT_ID = "cf3f9ff6-5956-4e95-aca5-e318362d211b";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    console.error("Missing .env.local in repo root.");
    process.exit(1);
  }
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function dumpError(label: string, error: unknown) {
  console.log(`\n===== FAIL: ${label} =====`);
  if (!error || typeof error !== "object") {
    console.log(String(error));
    return;
  }
  const e = error as Record<string, unknown>;
  console.log(
    JSON.stringify(
      {
        message: e.message,
        code: e.code,
        details: e.details,
        hint: e.hint,
        status: e.status,
        statusCode: e.statusCode,
        name: e.name,
        // full object in case supabase adds fields
        raw: e,
      },
      null,
      2
    )
  );
}

async function runQuery(
  label: string,
  runner: () => PromiseLike<{ data: unknown; error: unknown }>
) {
  console.log(`\n----- ${label} -----`);
  try {
    const { data, error } = await runner();
    if (error) {
      dumpError(label, error);
      return { ok: false as const, data: null, error };
    }
    const preview = Array.isArray(data)
      ? { rowCount: data.length, sample: data.slice(0, 2) }
      : data;
    console.log("OK");
    console.log(JSON.stringify(preview, null, 2));
    return { ok: true as const, data, error: null };
  } catch (err) {
    dumpError(`${label} (threw)`, {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return { ok: false as const, data: null, error: err };
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const projectId =
    process.env.PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;

  if (!url || !anon) {
    console.error(
      "Need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
    process.exit(1);
  }

  console.log("=== Em Call project-financial diagnostics ===");
  console.log(`project_id: ${projectId}`);
  console.log(`supabase url: ${url}`);

  let supabase: SupabaseClient;
  let userId: string | null = null;
  let authMode: string;

  if (service) {
    authMode = "service_role";
    supabase = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    // Discover owning user from the project row
    const { data: proj, error } = await supabase
      .from("projects")
      .select("id, user_id, project_name")
      .eq("id", projectId)
      .maybeSingle();
    if (error) {
      dumpError("bootstrap project lookup (service_role)", error);
      process.exit(1);
    }
    if (!proj) {
      console.error("Project not found with service_role — wrong PROJECT_ID?");
      process.exit(1);
    }
    userId = String(proj.user_id);
    console.log(`auth: service_role (impersonating filters as user_id=${userId})`);
    console.log(`project_name: ${proj.project_name}`);
  } else {
    authMode = "password";
    const email = process.env.DIAG_EMAIL?.trim();
    const password = process.env.DIAG_PASSWORD?.trim();
    if (!email || !password) {
      console.error(`
No SUPABASE_SERVICE_ROLE_KEY found.

Add ONE of the following to .env.local and re-run:

  SUPABASE_SERVICE_ROLE_KEY=...

or

  DIAG_EMAIL=your-login-email
  DIAG_PASSWORD=your-login-password
`);
      process.exit(1);
    }
    supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      dumpError("signInWithPassword", authError ?? { message: "no user" });
      process.exit(1);
    }
    userId = authData.user.id;
    console.log(`auth: password login as ${email} (user_id=${userId})`);
  }

  console.log("\n############################################");
  console.log("# PATH A — Em Call get_financial_summary  #");
  console.log("# (assertOwnedProject + financial loads)  #");
  console.log("############################################");

  // Exact select from assertOwnedProject after PR #123/#124
  const emCallProjectSelect =
    "id, project_name, status, value, start_date, end_date, address, deposit_amount, customer_id, notes, customers(first_name, last_name), quotes(project_name, quote_number, grand_total)";

  const owned = await runQuery("Em Call assertOwnedProject", () =>
    supabase
      .from("projects")
      .select(emCallProjectSelect)
      .eq("user_id", userId!)
      .eq("id", projectId)
      .maybeSingle()
  );

  // Also try WITHOUT user_id filter (matches Project Detail page)
  await runQuery("Em Call project select WITHOUT user_id filter", () =>
    supabase
      .from("projects")
      .select(emCallProjectSelect)
      .eq("id", projectId)
      .maybeSingle()
  );

  // Isolate embed failures
  await runQuery("projects select * only (no embeds)", () =>
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle()
  );
  await runQuery("projects + quotes(project_name, quote_number)", () =>
    supabase
      .from("projects")
      .select("id, quotes(project_name, quote_number)")
      .eq("id", projectId)
      .maybeSingle()
  );
  await runQuery("projects + quotes(..., grand_total)", () =>
    supabase
      .from("projects")
      .select("id, quotes(project_name, quote_number, grand_total)")
      .eq("id", projectId)
      .maybeSingle()
  );
  await runQuery("projects + quotes(total)  [known-bad column]", () =>
    supabase
      .from("projects")
      .select("id, quotes(project_name, quote_number, total)")
      .eq("id", projectId)
      .maybeSingle()
  );
  await runQuery("projects + customers(first_name, last_name)", () =>
    supabase
      .from("projects")
      .select("id, customers(first_name, last_name)")
      .eq("id", projectId)
      .maybeSingle()
  );

  const childQueries: Array<[string, () => PromiseLike<{ data: unknown; error: unknown }>]> = [
    [
      "project_payments (Em Call: user_id + project_id)",
      () =>
        supabase
          .from("project_payments")
          .select("*")
          .eq("user_id", userId!)
          .eq("project_id", projectId),
    ],
    [
      "project_expenses (Em Call: user_id + project_id)",
      () =>
        supabase
          .from("project_expenses")
          .select("*")
          .eq("user_id", userId!)
          .eq("project_id", projectId),
    ],
    [
      "material_orders (Em Call: user_id + project_id)",
      () =>
        supabase
          .from("material_orders")
          .select("*")
          .eq("user_id", userId!)
          .eq("project_id", projectId),
    ],
    [
      "time_entries + employees embed (Em Call)",
      () =>
        supabase
          .from("time_entries")
          .select("*, employees(id, full_name, role, pay_rate, pay_type)")
          .eq("user_id", userId!)
          .eq("project_id", projectId),
    ],
    [
      "change_orders (Em Call: user_id + project_id)",
      () =>
        supabase
          .from("change_orders")
          .select("*")
          .eq("user_id", userId!)
          .eq("project_id", projectId),
    ],
  ];

  const childResults: Record<string, { ok: boolean; data: unknown }> = {};
  for (const [label, runner] of childQueries) {
    const res = await runQuery(label, runner);
    childResults[label] = { ok: res.ok, data: res.data };
  }

  console.log("\n############################################");
  console.log("# PATH B — Project Detail page queries    #");
  console.log("# (no user_id filter; quotes(*))          #");
  console.log("############################################");

  const detailProject = await runQuery("Project Detail: projects(*, quotes(*))", () =>
    supabase
      .from("projects")
      .select("*, quotes(*)")
      .eq("id", projectId)
      .maybeSingle()
  );

  await runQuery("Project Detail: project_payments by project_id only", () =>
    supabase.from("project_payments").select("*").eq("project_id", projectId)
  );
  await runQuery("Project Detail: project_expenses by project_id only", () =>
    supabase.from("project_expenses").select("*").eq("project_id", projectId)
  );
  await runQuery("Project Detail: material_orders by project_id only", () =>
    supabase.from("material_orders").select("*").eq("project_id", projectId)
  );
  await runQuery("Project Detail: time_entries + employees", () =>
    supabase
      .from("time_entries")
      .select("*, employees(id, full_name, role, pay_rate, pay_type)")
      .eq("project_id", projectId)
  );
  await runQuery("Project Detail: change_orders by project_id only", () =>
    supabase.from("change_orders").select("*").eq("project_id", projectId)
  );

  console.log("\n############################################");
  console.log("# Aggregation (shared computeFinancialSummary) #");
  console.log("############################################");

  if (owned.ok && owned.data) {
    try {
      const project = owned.data as {
        value?: number;
        deposit_amount?: number;
        quotes?: { grand_total?: number } | null;
      };
      const payments =
        (childResults["project_payments (Em Call: user_id + project_id)"]
          ?.data as Array<{ payment_type: string; amount: number }>) ?? [];
      const expenses =
        (childResults["project_expenses (Em Call: user_id + project_id)"]
          ?.data as Array<{
          amount: number;
          billing_status?: string;
          payment_status?: string;
          expense_kind?: string;
        }>) ?? [];
      const materialOrders =
        (childResults["material_orders (Em Call: user_id + project_id)"]
          ?.data as unknown[]) ?? [];
      const timeEntries =
        (childResults["time_entries + employees embed (Em Call)"]
          ?.data as unknown[]) ?? [];
      const changeOrders =
        (childResults["change_orders (Em Call: user_id + project_id)"]
          ?.data as Array<{ amount: number; status: string }>) ?? [];

      const quoteAmount = Number(
        project.value ?? project.quotes?.grand_total ?? 0
      );
      const summary = computeFinancialSummary({
        quoteAmount,
        depositAmount: Number(project.deposit_amount ?? 0),
        payments: payments as never,
        expenses: expenses as never,
        materialOrders: materialOrders as never,
        timeEntries: timeEntries as never,
        changeOrders: changeOrders as never,
      });

      console.log("\nEm Call-path summary (if all child queries OK):");
      console.log(
        JSON.stringify(
          {
            contractValue: summary.contractValue,
            customerPayments: summary.customerPayments,
            outstandingCustomerBalance: summary.outstandingCustomerBalance,
            totalProjectCost: summary.totalProjectCost,
            grossProfit: summary.grossProfit,
            expectedUI: {
              contract: 8324,
              costs: 4890,
              profit: 3434,
              outstanding: 7824,
            },
          },
          null,
          2
        )
      );
    } catch (err) {
      dumpError("computeFinancialSummary threw", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
  } else {
    console.log(
      "\nSkipping aggregation — Em Call assertOwnedProject failed (see FAIL block above)."
    );
  }

  if (detailProject.ok && detailProject.data) {
    console.log(
      "\nNOTE: Project Detail UI uses the SAME computeFinancialSummary() helper."
    );
    console.log(
      "Data LOADING is a SEPARATE query path (no user_id filters; quotes(*))."
    );
  }

  console.log("\n=== DONE ===");
  console.log(`authMode=${authMode} userId=${userId}`);
  console.log(
    "Paste everything above (especially any FAIL / PostgREST JSON) back to the agent."
  );
}

main().catch((err) => {
  dumpError("script crashed", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
