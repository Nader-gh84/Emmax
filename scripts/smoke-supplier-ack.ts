/**
 * Smoke: supplier ack URL + email button wiring (no DB required).
 * Run: npx tsx scripts/smoke-supplier-ack.ts
 */
import { buildSupplierRequestEmailHtml } from "../src/lib/email/supplier-email";
import { buildSupplierAckUrl } from "../src/lib/supplier-ack";

const token = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const ackUrl = buildSupplierAckUrl(token, "https://example.com");

if (ackUrl !== `https://example.com/supplier-ack/${token}`) {
  throw new Error(`Unexpected ack URL: ${ackUrl}`);
}

const html = buildSupplierRequestEmailHtml({
  messageBody: "Hello,\n\nPlease quote these materials.",
  materials: [
    { item: "14/2 Wire", brand: "Nexans", quantity: 100, unit: "ft" },
  ],
  projectName: "Kitchen",
  companyName: "Acme Electric",
  acknowledgeUrl: ackUrl,
});

if (!html.includes("I received this — pricing coming soon")) {
  throw new Error("Email HTML missing acknowledgment button label");
}
if (!html.includes(ackUrl)) {
  throw new Error("Email HTML missing acknowledgment URL");
}
if (html.includes("blob:") || html.includes("data:")) {
  throw new Error("Email HTML must not use blob/data ack URLs");
}

const withoutAck = buildSupplierRequestEmailHtml({
  messageBody: "Hello",
  materials: [{ item: "Outlet", brand: "Generic", quantity: 2, unit: "each" }],
  acknowledgeUrl: "blob:https://evil",
});

if (withoutAck.includes("I received this")) {
  throw new Error("blob ack URLs must not render a button");
}

console.log("smoke-supplier-ack: OK", { ackUrl });
