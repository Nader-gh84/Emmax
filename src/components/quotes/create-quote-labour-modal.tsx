"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconMicrophone } from "@/components/dashboard/icons";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import {
  buildLabourConfirmSpeech,
  formatCad,
  formatPct,
  parseLabourHoursFromText,
  parseLabourSellFromText,
  summarizeCreateQuoteLabour,
} from "@/lib/create-quote-labour";
import { unlockTtsAudio } from "@/lib/tts-audio-bus";
import { createClient } from "@/lib/supabase";
import type { Employee } from "@/types/employee";
import {
  normalizeLabourBillingMode,
  normalizeLabourMarginWarnPercent,
  type LabourBillingMode,
} from "@/types/labour-quoting";
import { formatCurrency, type Quote } from "@/types/quote";

export type CreateQuoteLabourConfirmPayload = {
  hoursByEmployeeId: Record<string, number>;
  billingMode: LabourBillingMode;
  sellHourlyRate: number;
  sellFlatAmount: number;
};

const NO_EMPLOYEES_MESSAGE =
  "I can't work out labour cost yet — you haven't added any employees. Add them with their pay rates first and I'll do the math.";

export function CreateQuoteLabourModal({
  quote,
  isSaving,
  onClose,
  onConfirm,
}: {
  quote: Quote;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (payload: CreateQuoteLabourConfirmPayload) => void | Promise<void>;
}) {
  const tts = useTtsPlayback();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [hoursByEmployeeId, setHoursByEmployeeId] = useState<
    Record<string, number>
  >({});
  const [billingMode, setBillingMode] =
    useState<LabourBillingMode>("time_and_material");
  const [sellHourlyRate, setSellHourlyRate] = useState("");
  const [sellFlatAmount, setSellFlatAmount] = useState("");
  const [warnBelowPercent, setWarnBelowPercent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [marginAcknowledged, setMarginAcknowledged] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("You must be logged in.");
      return;
    }

    const [employeesResult, profileResult, projectResult] = await Promise.all([
      supabase
        .from("employees")
        .select("*")
        .order("full_name", { ascending: true }),
      supabase
        .from("business_profiles")
        .select("labour_margin_warn_percent")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("projects")
        .select("id")
        .eq("quote_id", quote.id)
        .maybeSingle(),
    ]);

    if (employeesResult.error) {
      setLoadError("Failed to load employees. Please try again.");
      return;
    }

    const list = (employeesResult.data as Employee[]) ?? [];
    setEmployees(list);

    setWarnBelowPercent(
      normalizeLabourMarginWarnPercent(
        profileResult.data?.labour_margin_warn_percent
      )
    );

    const mode = normalizeLabourBillingMode(quote.labour_billing_mode);
    if (mode) setBillingMode(mode);

    // Prefill hours from existing quote_estimate rows when re-opening.
    const projectId = projectResult.data?.id as string | undefined;
    if (projectId) {
      const { data: estimates } = await supabase
        .from("time_entries")
        .select("employee_id, hours")
        .eq("project_id", projectId)
        .eq("entry_source", "quote_estimate");

      if (estimates && estimates.length > 0) {
        const next: Record<string, number> = {};
        for (const row of estimates) {
          next[row.employee_id as string] = Number(row.hours) || 0;
        }
        setHoursByEmployeeId(next);
      }
    }

    // Prefill sell from existing labour_items when present.
    const labour = quote.labour_items ?? [];
    if (labour.length > 0) {
      if (mode === "flat" || (labour.length === 1 && labour[0].hours === 1)) {
        if (mode === "flat" || labour[0].hours === 1) {
          setBillingMode(mode ?? "flat");
          setSellFlatAmount(String(labour[0].rate ?? ""));
        }
      } else {
        const rate = labour[0]?.rate;
        if (rate != null && Number.isFinite(Number(rate))) {
          setBillingMode("time_and_material");
          setSellHourlyRate(String(rate));
        }
      }
    }
  }, [quote.id, quote.labour_billing_mode, quote.labour_items]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await load();
      setIsLoading(false);
    }
    void init();
  }, [load]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving && !voiceBusy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose, voiceBusy]);

  const summary = useMemo(
    () =>
      summarizeCreateQuoteLabour({
        employees,
        hoursByEmployeeId,
        billingMode,
        sellHourlyRate: Number.parseFloat(sellHourlyRate) || 0,
        sellFlatAmount: Number.parseFloat(sellFlatAmount) || 0,
        warnBelowPercent,
      }),
    [
      billingMode,
      employees,
      hoursByEmployeeId,
      sellFlatAmount,
      sellHourlyRate,
      warnBelowPercent,
    ]
  );

  useEffect(() => {
    setMarginAcknowledged(false);
  }, [
    billingMode,
    hoursByEmployeeId,
    sellFlatAmount,
    sellHourlyRate,
    warnBelowPercent,
  ]);

  const applyVoiceText = useCallback(
    (transcript: string) => {
      const hours = parseLabourHoursFromText(transcript, employees);
      const sell = parseLabourSellFromText(transcript);
      let applied = false;

      if (Object.keys(hours).length > 0) {
        setHoursByEmployeeId((current) => ({ ...current, ...hours }));
        applied = true;
      }
      if (sell.billingMode) {
        setBillingMode(sell.billingMode);
        applied = true;
      }
      if (sell.sellHourlyRate != null) {
        setSellHourlyRate(String(sell.sellHourlyRate));
        applied = true;
      }
      if (sell.sellFlatAmount != null) {
        setSellFlatAmount(String(sell.sellFlatAmount));
        applied = true;
      }

      setVoiceHint(
        applied
          ? `Heard: “${transcript.trim()}” — fields updated. Review the numbers below.`
          : `Heard: “${transcript.trim()}” — couldn't match hours or a sell price. Try “Reza 8 hours” or “sell at $120 an hour”.`
      );
    },
    [employees]
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob, meta: { hasSpeech: boolean }) => {
      if (!meta.hasSpeech) {
        setVoiceHint("Didn't catch that — try again.");
        setVoiceBusy(false);
        return;
      }

      setVoiceBusy(true);
      try {
        const form = new FormData();
        form.append("audio", blob, "labour.webm");
        form.append("extract", "false");
        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const data = (await response.json().catch(() => null)) as {
          transcript?: string;
          error?: string;
        } | null;
        if (!response.ok || !data?.transcript?.trim()) {
          throw new Error(data?.error || "Couldn't transcribe that.");
        }
        applyVoiceText(data.transcript.trim());
      } catch (err) {
        setVoiceHint(
          err instanceof Error ? err.message : "Voice capture failed."
        );
      } finally {
        setVoiceBusy(false);
      }
    },
    [applyVoiceText]
  );

  const {
    status: recorderStatus,
    startRecording,
    stopRecording,
    error: recorderError,
  } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
    manualStopOnly: true,
  });

  const isRecording = recorderStatus === "recording";

  async function toggleVoice() {
    setFormError(null);
    unlockTtsAudio();
    if (isRecording) {
      await stopRecording();
      return;
    }
    setVoiceHint("Listening… say hours like “Reza 8 hours, Ali 12 hours”.");
    try {
      await startRecording();
    } catch {
      setVoiceHint("Microphone permission needed for voice entry.");
    }
  }

  async function handleConfirm() {
    setFormError(null);

    if (employees.length === 0) {
      setFormError(NO_EMPLOYEES_MESSAGE);
      return;
    }

    if (summary.lines.length === 0) {
      setFormError("Assign hours to at least one employee.");
      return;
    }

    if (summary.missingRateNames.length > 0) {
      setFormError(
        `Missing hourly pay rate for: ${summary.missingRateNames.join(", ")}. Add rates in Settings → Employees.`
      );
      return;
    }

    if (summary.charged <= 0) {
      setFormError(
        billingMode === "flat"
          ? "Enter the flat amount you're charging for labour."
          : "Enter the customer hourly rate you're charging for labour."
      );
      return;
    }

    if (summary.warn && !marginAcknowledged) {
      setFormError(
        `Heads up — your labour cost is ${formatCad(summary.totalCost)} and you're charging ${formatCad(summary.charged)}. That's a ${formatPct(summary.marginPercent)} margin. Check “Proceed anyway” to continue.`
      );
      return;
    }

    const speech = buildLabourConfirmSpeech(summary);
    unlockTtsAudio();
    void tts.play(speech, { silentFail: true });

    await onConfirm({
      hoursByEmployeeId,
      billingMode,
      sellHourlyRate: Number.parseFloat(sellHourlyRate) || 0,
      sellFlatAmount: Number.parseFloat(sellFlatAmount) || 0,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        disabled={isSaving}
        onClick={() => {
          if (!isSaving && !voiceBusy) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-quote-labour-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0b1220] shadow-2xl sm:rounded-2xl"
      >
        <div className="border-b border-white/10 px-5 py-4">
          <h2
            id="create-quote-labour-title"
            className="text-lg font-semibold text-white"
          >
            Create Quote — Labour
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Assign hours (cost from pay rates), then enter what you charge the
            customer. Voice fills the form — always verify the numbers.
          </p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading employees…</p>
          ) : null}

          {loadError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {loadError}
            </div>
          ) : null}

          {!isLoading && employees.length === 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
              <p>{NO_EMPLOYEES_MESSAGE}</p>
              <Link
                href="/dashboard/settings?section=employees"
                className="mt-3 inline-flex font-semibold text-cyan-300 underline-offset-2 hover:underline"
              >
                Open Settings → Employees
              </Link>
            </div>
          ) : null}

          {!isLoading && employees.length > 0 ? (
            <>
              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    1. Hours per employee
                  </h3>
                  <button
                    type="button"
                    onClick={() => void toggleVoice()}
                    disabled={isSaving || voiceBusy}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3 text-sm font-medium transition ${
                      isRecording
                        ? "bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40"
                        : "bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    <IconMicrophone className="h-4 w-4" />
                    {isRecording
                      ? "Stop"
                      : voiceBusy
                        ? "Working…"
                        : "Say it"}
                  </button>
                </div>
                {voiceHint || recorderError ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {recorderError || voiceHint}
                  </p>
                ) : null}

                <ul className="mt-3 space-y-3">
                  {employees.map((employee) => {
                    const rate = Number(employee.pay_rate);
                    const rateLabel =
                      employee.pay_type !== "hourly" ||
                      !Number.isFinite(rate) ||
                      rate <= 0
                        ? "No hourly rate"
                        : `${formatCurrency(rate)}/hr`;
                    return (
                      <li
                        key={employee.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">
                            {employee.full_name}
                          </p>
                          <p className="text-xs text-slate-500">{rateLabel}</p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-400">
                          <input
                            type="number"
                            min={0}
                            step={0.25}
                            inputMode="decimal"
                            className={`${touchInput} w-24 min-h-[44px]`}
                            value={hoursByEmployeeId[employee.id] ?? ""}
                            placeholder="0"
                            onChange={(event) => {
                              const raw = event.target.value;
                              setHoursByEmployeeId((current) => {
                                const next = { ...current };
                                if (!raw.trim()) {
                                  delete next[employee.id];
                                  return next;
                                }
                                const n = Number.parseFloat(raw);
                                next[employee.id] = Number.isFinite(n)
                                  ? Math.max(0, n)
                                  : 0;
                                return next;
                              });
                            }}
                          />
                          hrs
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-white">
                  2. Customer labour price
                </h3>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingMode("time_and_material")}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition ${
                      billingMode === "time_and_material"
                        ? "bg-accent/20 text-white ring-accent/50"
                        : "bg-white/5 text-slate-300 ring-white/10"
                    }`}
                  >
                    Time &amp; Material
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingMode("flat")}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition ${
                      billingMode === "flat"
                        ? "bg-accent/20 text-white ring-accent/50"
                        : "bg-white/5 text-slate-300 ring-white/10"
                    }`}
                  >
                    Flat agreed
                  </button>
                </div>

                {billingMode === "time_and_material" ? (
                  <label className="mt-3 block text-sm text-slate-400">
                    Sell at ($/hour)
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      className={`${touchInput} mt-1.5`}
                      value={sellHourlyRate}
                      placeholder="e.g. 120"
                      onChange={(event) =>
                        setSellHourlyRate(event.target.value)
                      }
                    />
                  </label>
                ) : (
                  <label className="mt-3 block text-sm text-slate-400">
                    Flat labour amount ($)
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      inputMode="decimal"
                      className={`${touchInput} mt-1.5`}
                      value={sellFlatAmount}
                      placeholder="e.g. 800"
                      onChange={(event) =>
                        setSellFlatAmount(event.target.value)
                      }
                    />
                  </label>
                )}
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <h3 className="text-sm font-semibold text-white">
                  3. Cost vs price
                </h3>
                {summary.lines.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    {summary.lines.map((line) => (
                      <li key={line.employeeId}>
                        {line.fullName}: {line.hours} hrs
                        {line.missingRate
                          ? " — missing rate"
                          : ` × ${formatCad(line.payRate)} = ${formatCad(line.cost)}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Enter hours to see labour cost.
                  </p>
                )}

                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Labour cost</dt>
                    <dd className="font-semibold text-white">
                      {formatCad(summary.totalCost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Charging customer</dt>
                    <dd className="font-semibold text-white">
                      {formatCad(summary.charged)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Margin</dt>
                    <dd
                      className={`font-semibold ${
                        summary.warn ? "text-amber-300" : "text-emerald-300"
                      }`}
                    >
                      {formatCad(summary.marginAmount)} (
                      {formatPct(summary.marginPercent)})
                    </dd>
                  </div>
                </dl>

                {summary.warn ? (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                    <p>
                      Heads up — your labour cost is{" "}
                      {formatCad(summary.totalCost)} and you&apos;re charging{" "}
                      {formatCad(summary.charged)}. That&apos;s a{" "}
                      {formatPct(summary.marginPercent)} margin. Are you sure?
                    </p>
                    <label className="mt-3 flex items-start gap-2 text-amber-50">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={marginAcknowledged}
                        onChange={(event) =>
                          setMarginAcknowledged(event.target.checked)
                        }
                      />
                      <span>Proceed anyway</span>
                    </label>
                  </div>
                ) : null}

                {summary.missingRateNames.length > 0 ? (
                  <p className="mt-3 text-sm text-rose-300">
                    Missing hourly pay rate for:{" "}
                    {summary.missingRateNames.join(", ")}.{" "}
                    <Link
                      href="/dashboard/settings?section=employees"
                      className="underline underline-offset-2"
                    >
                      Fix in Settings
                    </Link>
                  </p>
                ) : null}
              </section>
            </>
          ) : null}

          {formError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {formError}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className={`${touchBtnSecondary} w-full sm:w-auto`}
            disabled={isSaving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${touchBtnPrimary} w-full sm:w-auto`}
            disabled={
              isSaving || isLoading || employees.length === 0 || voiceBusy
            }
            onClick={() => void handleConfirm()}
          >
            {isSaving ? "Creating quote…" : "Confirm & create quote"}
          </button>
        </div>
      </div>
    </div>
  );
}
