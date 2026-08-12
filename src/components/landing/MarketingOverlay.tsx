import type { ReactNode } from "react";

/**
 * Transparent hit-target overlay layer for raw mockup pages.
 * Place client components (e.g. *Interactive.tsx) inside MarketingMockupStage.
 */
export default function MarketingOverlay({
  children,
}: {
  children?: ReactNode;
}) {
  return <div className="absolute inset-0 z-10">{children}</div>;
}
