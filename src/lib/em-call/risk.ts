/**
 * Em Call with Ema — risk classification (financial impact).
 *
 * REQUIRES on-screen confirmation card before execute:
 * - record_payment (customer, supplier, labour)
 * - add_expense (affects Total Project Cost, Gross Profit, Cash Flow)
 * - any other write of a money value
 * - draft_email (free-form to customer/supplier)
 * - any deletion
 *
 * EXECUTES DIRECTLY (spoken confirmation after):
 * - add_task / edit_task / mark complete
 * - log_time (hours only)
 * - all read operations
 */

export const EM_CALL_CONFIRM_TOOLS = [
  "record_payment",
  "add_expense",
  "draft_email",
  "delete_entity",
] as const;

export const EM_CALL_DIRECT_WRITE_TOOLS = [
  "add_task",
  "edit_task",
  "log_time",
] as const;

export type EmCallConfirmTool = (typeof EM_CALL_CONFIRM_TOOLS)[number];
export type EmCallDirectWriteTool = (typeof EM_CALL_DIRECT_WRITE_TOOLS)[number];

export function requiresEmCallConfirmation(toolName: string): boolean {
  return (EM_CALL_CONFIRM_TOOLS as readonly string[]).includes(toolName);
}
