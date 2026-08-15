"use client";

import { EmCallMobileFab } from "@/components/em-call/em-call-launcher";
import { EmCallOverlay } from "@/components/em-call/em-call-overlay";
import { EmCallProvider } from "@/components/em-call/em-call-provider";

export function EmCallRoot({
  greetingName,
  children,
}: {
  greetingName: string;
  children: React.ReactNode;
}) {
  return (
    <EmCallProvider greetingName={greetingName}>
      {children}
      <EmCallMobileFab />
      <EmCallOverlay />
    </EmCallProvider>
  );
}
