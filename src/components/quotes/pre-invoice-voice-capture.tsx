"use client";

import { VoiceQuoteBuilder } from "@/components/quotes/voice-quote-builder";

/**
 * Pre-Invoices dashboard embed: full Voice Quote Builder (recording, editable
 * materials table, pricing, actions, details) sharing the same component used
 * by /dashboard/voice-quote-builder.
 */
export function PreInvoiceVoiceCapture({
  onProjectCreated,
  onProjectNameChange,
}: {
  onProjectCreated: (quoteId?: string) => void;
  onProjectNameChange?: (name: string) => void;
}) {
  return (
    <VoiceQuoteBuilder
      embedded
      onPersisted={onProjectCreated}
      onProjectNameChange={onProjectNameChange}
    />
  );
}
