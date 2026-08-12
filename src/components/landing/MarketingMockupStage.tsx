import type { ReactNode } from "react";

type MarketingMockupStageProps = {
  /** Public URL path, e.g. /images/About.png */
  src: string;
  alt: string;
  /** Native pixel size of the mockup asset */
  widthPx: number;
  heightPx: number;
  children?: ReactNode;
};

/**
 * Full-bleed marketing mockup stage (PR #98 pattern):
 * width = max(100vw, 100dvh × aspect) — no letterboxing, no cropping;
 * overflow scrolls so the full image stays reachable.
 */
export default function MarketingMockupStage({
  src,
  alt,
  widthPx,
  heightPx,
  children,
}: MarketingMockupStageProps) {
  const aspect = `${widthPx} / ${heightPx}`;

  return (
    <main className="box-border min-h-dvh w-full bg-black">
      <div
        className="relative mx-auto"
        style={{
          aspectRatio: aspect,
          width: `max(100vw, calc(100dvh * ${widthPx} / ${heightPx}))`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- raw mockup asset, no optimization */}
        <img
          src={src}
          alt={alt}
          className="pointer-events-none absolute inset-0 z-0 box-border h-full w-full select-none"
          draggable={false}
        />
        {children}
      </div>
    </main>
  );
}
