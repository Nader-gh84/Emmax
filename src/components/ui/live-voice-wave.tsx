"use client";

type LiveVoiceWaveMode = "listening" | "speaking" | "idle";

const DEFAULT_BARS = 7;

/**
 * WhatsApp-style voice bars.
 * - listening: heights driven by live mic `levels` (0–1)
 * - speaking: gentle non-mic pulse so Ema’s TTS is visually distinct
 * - idle: near-flat line
 */
export function LiveVoiceWave({
  levels,
  mode = "idle",
  barCount = DEFAULT_BARS,
  className = "",
  barClassName = "bg-cyan-300/90",
  speakingBarClassName = "bg-accent/80",
}: {
  levels?: number[] | null;
  mode?: LiveVoiceWaveMode;
  barCount?: number;
  className?: string;
  barClassName?: string;
  speakingBarClassName?: string;
}) {
  const count = Math.max(3, barCount);
  const safeLevels =
    levels && levels.length > 0
      ? levels
      : Array.from({ length: count }, () => 0.04);

  return (
    <div
      className={`flex h-10 items-end justify-center gap-1 ${className}`}
      aria-hidden="true"
      data-wave-mode={mode}
    >
      {Array.from({ length: count }).map((_, i) => {
        if (mode === "speaking") {
          return (
            <span
              key={i}
              className={`em-call-ema-speak w-1 rounded-full ${speakingBarClassName}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          );
        }

        const level =
          mode === "listening"
            ? Math.min(1, Math.max(0.03, safeLevels[i % safeLevels.length] ?? 0.03))
            : 0.04;
        const heightPx = 3 + level * 29;

        return (
          <span
            key={i}
            className={`w-1 rounded-full transition-[height,opacity] duration-75 ease-out ${barClassName}`}
            style={{
              height: `${heightPx}px`,
              opacity: mode === "listening" ? 0.45 + level * 0.55 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
}
