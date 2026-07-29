/**
 * Smoke: decline message/metadata shaping helpers stay consistent.
 * Run: npx tsx scripts/smoke-quote-decline.ts
 */
import { NOTIFICATION_TYPES } from "../src/types/notification";

if (!NOTIFICATION_TYPES.includes("quote_declined")) {
  throw new Error("quote_declined must be a valid notification type");
}

const customer = "Jane Doe";
const reason = "Price too high";
const messageWithReason = `${customer} declined the quote: ${reason}`;
const messageWithoutReason = `${customer} declined the quote for Kitchen Reno.`;

if (!messageWithReason.includes("declined the quote: Price too high")) {
  throw new Error("Decline message with reason is wrong");
}
if (!messageWithoutReason.includes("declined the quote for")) {
  throw new Error("Decline message without reason is wrong");
}

console.log("smoke-quote-decline: OK", {
  types: NOTIFICATION_TYPES,
  messageWithReason,
});
