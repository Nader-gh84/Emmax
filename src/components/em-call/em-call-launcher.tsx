"use client";

import { IconMicrophone } from "@/components/dashboard/icons";
import { IconWaveform } from "@/components/dashboard/workspace-icons";
import { useEmCall } from "@/components/em-call/em-call-provider";

/** Desktop sidebar entry for Em Call with Ema */
export function EmCallSidebarLauncher() {
  const { isOpen, startCall } = useEmCall();

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-cyan-400 text-sm font-bold text-white shadow-lg shadow-accent/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Emmax.png"
            alt=""
            className="h-full w-full object-cover object-top"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Em Call with Ema</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            Talk to your AI teammate
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={startCall}
          disabled={isOpen}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition hover:bg-blue-600 disabled:opacity-60"
          aria-label="Start Em Call with Ema"
        >
          <IconMicrophone className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/10 bg-navy/60 px-3 py-2">
          <IconWaveform className="h-4 w-4 shrink-0 text-cyan-400" />
          <span className="truncate text-xs font-medium text-slate-300">
            {isOpen ? "On a call…" : "Tap mic to start"}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Mobile FAB — visible below lg so Em Call works on every page */
export function EmCallMobileFab() {
  const { isOpen, startCall } = useEmCall();

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={startCall}
      className="fixed bottom-[5.5rem] right-4 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-[#14263D]/95 py-2.5 pl-2.5 pr-4 text-white shadow-xl shadow-black/40 backdrop-blur-md transition hover:border-accent/40 hover:bg-[#1a2f4a] lg:hidden"
      aria-label="Start Em Call with Ema"
    >
      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-cyan-400 shadow-lg shadow-accent/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Emmax.png"
          alt=""
          className="h-full w-full object-cover object-top"
          aria-hidden="true"
        />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-xs font-semibold">Em Call</span>
        <span className="text-[10px] text-slate-400">with Ema</span>
      </span>
      <IconMicrophone className="ml-1 h-4 w-4 text-cyan-300" />
    </button>
  );
}
