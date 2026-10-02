/**
 * Create Quote T&M sell rate persists as a column, not only labour_items JSON.
 * Run: npx tsx scripts/smoke-labour-sell-hourly-rate.ts
 */
import { labourSellHourlyRateToPersist } from "../src/lib/create-quote-labour";

const tm = labourSellHourlyRateToPersist("time_and_material", 85.5);
if (tm !== 85.5) {
  throw new Error(`Expected T&M persist 85.5, got ${String(tm)}`);
}

const rounded = labourSellHourlyRateToPersist("time_and_material", 85.555);
if (rounded !== 85.56) {
  throw new Error(`Expected T&M rounded 85.56, got ${String(rounded)}`);
}

const flat = labourSellHourlyRateToPersist("flat", 85.5);
if (flat !== null) {
  throw new Error(`Expected flat persist null, got ${String(flat)}`);
}

const zero = labourSellHourlyRateToPersist("time_and_material", 0);
if (zero !== null) {
  throw new Error(`Expected zero T&M rate to persist null, got ${String(zero)}`);
}

console.log("smoke-labour-sell-hourly-rate: ok");
