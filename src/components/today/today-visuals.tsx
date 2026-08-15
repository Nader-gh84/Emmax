"use client";

import type { ReactNode } from "react";
import {
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconDocument,
  IconEmployee,
  IconInvoice,
  IconMicrophone,
  IconTruck,
  IconUsers,
} from "@/components/dashboard/icons";
import { IconPhone, IconProjects } from "@/components/dashboard/workspace-icons";
import { LiveVoiceWave } from "@/components/ui/live-voice-wave";
import {
  agendaPriorityLabel,
  type AgendaPriority,
  type ScheduleTaskType,
} from "@/types/schedule-item";

/** Colored rounded square + category icon (reference task rows). */
export function TaskTypeIconBox({ type }: { type: ScheduleTaskType }) {
  const { box, Icon } = typeVisual(type);
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${box}`}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

function typeVisual(type: ScheduleTaskType): {
  box: string;
  Icon: (props: { className?: string }) => ReactNode;
} {
  switch (type) {
    case "pickup":
    case "delivery":
      return {
        box: "bg-cyan-500/20 text-cyan-300",
        Icon: IconTruck,
      };
    case "site_visit":
    case "inspection":
      return {
        box: "bg-violet-500/20 text-violet-300",
        Icon: IconProjects,
      };
    case "call":
      return {
        box: "bg-sky-500/20 text-sky-300",
        Icon: IconPhone,
      };
    case "payment_reminder":
      return {
        box: "bg-amber-500/20 text-amber-200",
        Icon: IconInvoice,
      };
    case "personal":
      return {
        box: "bg-emerald-500/20 text-emerald-300",
        Icon: IconEmployee,
      };
    case "project_task":
      return {
        box: "bg-accent/20 text-accent",
        Icon: IconDocument,
      };
    default:
      return {
        box: "bg-white/10 text-soft",
        Icon: IconCalendar,
      };
  }
}

export function PriorityBadge({ priority }: { priority: AgendaPriority }) {
  const styles =
    priority === "high"
      ? "bg-red-500/15 text-red-300 ring-red-500/30"
      : priority === "low"
        ? "bg-sky-500/15 text-sky-300 ring-sky-500/30"
        : "bg-amber-500/15 text-amber-200 ring-amber-500/30";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${styles}`}
    >
      {agendaPriorityLabel(priority)}
    </span>
  );
}

/**
 * Ema assistant avatar.
 * Placeholder illustration at /public/ema-avatar.png — replace with final branded asset later.
 */
export function EmaAvatar({
  size = "md",
  speaking = false,
  listening = false,
  levels = null,
}: {
  size?: "sm" | "md" | "lg";
  speaking?: boolean;
  /** True while the mic is open — drives live reactive bars. */
  listening?: boolean;
  /** Smoothed 0–1 mic levels from useVoiceRecorder. */
  levels?: number[] | null;
}) {
  const dim =
    size === "lg" ? "h-24 w-24" : size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const px = size === "lg" ? 96 : size === "sm" ? 40 : 56;
  const barCount = 4;
  const waveMode = listening ? "listening" : speaking ? "speaking" : "idle";

  return (
    <div className="relative shrink-0">
      <div
        className={`relative overflow-hidden rounded-full bg-gradient-to-br from-accent/30 to-cyan-400/30 shadow-lg shadow-accent/25 ring-2 ring-white/10 ${dim} ${
          speaking && !listening ? "animate-pulse ring-accent/60" : ""
        } ${listening ? "ring-accent/60" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static public placeholder asset */}
        <img
          src="/ema-avatar.png"
          alt="Ema"
          width={px}
          height={px}
          className="h-full w-full object-cover"
        />
      </div>
      {listening || speaking ? (
        <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2">
          <LiveVoiceWave
            mode={waveMode}
            levels={levels}
            barCount={barCount}
            className="h-5 gap-0.5"
            barClassName="bg-accent"
            speakingBarClassName="bg-accent"
          />
        </span>
      ) : null}
    </div>
  );
}

export function WaveformDecor({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-end gap-0.5 text-accent/70 ${className}`} aria-hidden>
      {[10, 16, 22, 14, 18, 12, 20, 11].map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-current opacity-80"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

export function StatPill({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "red" | "yellow" | "purple";
  icon: ReactNode;
}) {
  const tones = {
    blue: "bg-sky-500/15 text-sky-200 ring-sky-500/25",
    green: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
    red: "bg-red-500/15 text-red-200 ring-red-500/25",
    yellow: "bg-amber-500/15 text-amber-100 ring-amber-500/25",
    purple: "bg-violet-500/15 text-violet-200 ring-violet-500/25",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${tones[tone]}`}
    >
      <span className="opacity-80">{icon}</span>
      <span>
        {value} {label}
      </span>
    </span>
  );
}

export {
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconMicrophone,
  IconUsers,
};
