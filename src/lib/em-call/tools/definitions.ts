export type EmCallToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/**
 * OpenAI tool schemas for Em Call Chunk 2 (read-only).
 * Write / high-risk tools come in later chunks.
 */
export const EM_CALL_READ_TOOLS: EmCallToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "resolve_entity",
      description:
        "Resolve a spoken name to a customer, supplier, project, or employee using fuzzy + phonetic matching (voice transcripts are imperfect). Always prefer this before other tools when the user names someone or a job. If needs_clarification is true, ask the short clarification question returned — never guess. Use kind=any when unsure whether the name is a person or a project. Treat names that sound like Ema/Emma as possible customer/employee names — do not ignore them as references to you.",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["customer", "supplier", "project", "employee", "any"],
          },
          query: {
            type: "string",
            description: "Spoken or typed name fragment to match",
          },
          limit: {
            type: "number",
            description: "Max matches to return (default 5)",
          },
        },
        required: ["kind", "query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_today_agenda",
      description:
        "Get today's schedule: tasks, appointments, what's next, and a short summary for the contractor's local day.",
      parameters: {
        type: "object",
        properties: {
          date_key: {
            type: "string",
            description:
              "Optional YYYY-MM-DD (defaults to today in the user's timezone)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_projects",
      description:
        "List the user's projects, optionally filtered by status or customer.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "in_progress", "completed", "on_hold", "open"],
            description: "open = active + in_progress + on_hold",
          },
          customer_id: { type: "string" },
          query: { type: "string", description: "Optional name filter" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_project",
      description:
        "Get project status, dates, open tasks, assigned employees, hours logged, and task completion percent. Prefer resolve_entity first if you only have a name.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string" },
        },
        required: ["project_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_customer",
      description:
        "Get customer contact details (address, phone, email) and their projects with payment/outstanding status. Use after resolve_entity when asked for a customer's address, phone, or payment status.",
      parameters: {
        type: "object",
        properties: {
          customer_id: { type: "string" },
        },
        required: ["customer_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_supplier",
      description:
        "Get supplier contact info and outstanding balance / recent invoice payment summary.",
      parameters: {
        type: "object",
        properties: {
          supplier_id: { type: "string" },
        },
        required: ["supplier_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description:
        "Get financial figures. For a customer: outstanding balance and contract/payment rollup (same numbers as Customer Detail). For a project: profit, outstanding customer balance, unpaid supplier/labour costs, cash flow. For a supplier: outstanding balance owed. For portfolio: high-level unpaid totals across open projects. When the user asks about a customer's outstanding balance, use scope=customer with that customer's id.",
      parameters: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["customer", "project", "supplier", "portfolio"],
          },
          id: {
            type: "string",
            description:
              "customer_id, project_id, or supplier_id when scope is customer, project, or supplier",
          },
        },
        required: ["scope"],
      },
    },
  },
];

export const EM_CALL_READ_TOOL_NAMES = [
  "resolve_entity",
  "get_today_agenda",
  "list_projects",
  "get_project",
  "get_customer",
  "get_supplier",
  "get_financial_summary",
] as const;

export type EmCallReadToolName = (typeof EM_CALL_READ_TOOL_NAMES)[number];

export function isEmCallReadToolName(value: string): value is EmCallReadToolName {
  return (EM_CALL_READ_TOOL_NAMES as readonly string[]).includes(value);
}
