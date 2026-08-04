"use client";

import { useCallback, useMemo, useState } from "react";
import { IconMicrophone } from "@/components/dashboard/icons";
import { SendToSupplierModal } from "@/components/quotes/voice-quote-action-modals";
import { touchBtnPrimary, touchBtnSecondary } from "@/components/quotes/ui";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { mapExtractionToLineItems } from "@/lib/quote-extraction";
import {
  sendMaterialsToSupplier,
  type QuoteActionState,
} from "@/lib/quote-actions";
import type { Supplier } from "@/types/supplier";
import {
  type LabourItem,
  type MaterialItem,
  formatCurrency,
  formatTimer,
  materialLineTotal,
} from "@/types/quote";

type PipelinePhase =
  | "idle"
  | "transcribing"
  | "extracting"
  | "ready"
  | "error";

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

export function PreInvoiceVoiceCapture({
  onProjectCreated,
}: {
  onProjectCreated: () => void;
}) {
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [labourItems, setLabourItems] = useState<LabourItem[]>([]);
  const [notes, setNotes] = useState("");
  const [projectName, setProjectName] = useState("");
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const processTranscript = useCallback(
    async (nextTranscript: string, append: boolean) => {
      setPhase("extracting");
      setPipelineError(null);
      try {
        const response = await fetch("/api/extract-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: nextTranscript }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.error || "Couldn't parse that, try again or add items manually"
          );
        }
        const mapped = mapExtractionToLineItems(
          data.materials ?? [],
          data.labourItems ?? [],
          data.scopeOfWork ?? ""
        );
        if (append) {
          setMaterials((current) => [...current, ...mapped.materials]);
          setLabourItems((current) => [...current, ...mapped.labourItems]);
          setNotes((current) =>
            [current, mapped.scopeOfWork].filter(Boolean).join("\n\n")
          );
        } else {
          setMaterials(mapped.materials);
          setLabourItems(mapped.labourItems);
          setNotes(mapped.scopeOfWork);
        }
        setPhase("ready");
      } catch (error) {
        setPhase("error");
        setPipelineError(
          error instanceof Error
            ? error.message
            : "Couldn't parse that, try again or add items manually"
        );
      }
    },
    []
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      const append =
        Boolean(transcript.trim()) ||
        materials.length > 0 ||
        labourItems.length > 0;
      setPhase("transcribing");
      setPipelineError(null);
      setFeedback(null);
      setIsEditingTranscript(false);

      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("extract", "false");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Transcription failed");
        }

        const nextChunk =
          typeof data.transcript === "string" ? data.transcript.trim() : "";
        if (!nextChunk) {
          throw new Error("No transcript returned. Please try again.");
        }

        const combined = append
          ? [transcript.trim(), nextChunk].filter(Boolean).join(" ")
          : nextChunk;
        setTranscript(combined);
        await processTranscript(nextChunk, append);
      } catch (error) {
        setPhase("error");
        setPipelineError(
          error instanceof Error ? error.message : "Failed to process recording"
        );
      }
    },
    [labourItems.length, materials.length, processTranscript, transcript]
  );

  const {
    status: recorderStatus,
    error: recorderError,
    seconds,
    startRecording,
    stopRecording,
  } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
    silenceDurationMs: 2000,
  });

  const isRecording = recorderStatus === "recording";
  const isBusy =
    isRecording || phase === "transcribing" || phase === "extracting";

  const materialsTotal = useMemo(
    () => materials.reduce((sum, item) => sum + materialLineTotal(item), 0),
    [materials]
  );

  async function handleMicClick() {
    if (isBusy && !isRecording) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    await startRecording();
  }

  function buildActionState(): QuoteActionState {
    return {
      quoteId: null,
      quoteNumber: null,
      transcript,
      materials,
      labourItems,
      taxRate: 0,
      gstRate: 0,
      pstRate: 0,
      discountMode: "amount",
      discountAmount: 0,
      discountPercent: 0,
      customerMode: "new",
      selectedCustomerId: null,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      projectName: projectName.trim() || "Voice materials list",
      notes,
      validityDays: 30,
      validUntil: null,
      priceDisplayMode: "detailed",
    };
  }

  async function handleSendToSupplier(payload: {
    supplier: Supplier;
    supplierEmail: string;
    messageBody: string;
  }) {
    if (materials.length === 0) {
      setPipelineError("Add at least one material before sending to a supplier.");
      return;
    }

    setIsSending(true);
    setPipelineError(null);
    setFeedback(null);
    try {
      await sendMaterialsToSupplier(buildActionState(), {
        supplierName: payload.supplier.supplier_name,
        supplierEmail: payload.supplierEmail,
        messageBody: payload.messageBody,
      });
      setShowSupplierModal(false);
      setFeedback(
        `Materials list sent to ${payload.supplier.supplier_name}. Pre-invoice created — step 1 complete.`
      );
      setTranscript("");
      setMaterials([]);
      setLabourItems([]);
      setNotes("");
      setProjectName("");
      setPhase("idle");
      onProjectCreated();
    } catch (error) {
      setPipelineError(
        error instanceof Error ? error.message : "Failed to send to supplier"
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Record Your Voice
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Speak the materials list. Ema will extract line items, then you can
              send them to a supplier to create a pre-invoice card below.
            </p>
          </div>
          <input
            type="text"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name (optional)"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-accent sm:mt-0 sm:max-w-xs"
          />
        </div>

        {(recorderError || pipelineError || feedback) && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              recorderError || pipelineError
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {recorderError || pipelineError || feedback}
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/10 bg-navy/40 p-4">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => void handleMicClick()}
                disabled={phase === "transcribing" || phase === "extracting"}
                className={`flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition disabled:opacity-50 ${
                  isRecording
                    ? "bg-red-500 shadow-red-500/30 ring-4 ring-red-500/20"
                    : "bg-accent shadow-accent/30 ring-4 ring-accent/20 hover:bg-blue-600"
                }`}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {phase === "transcribing" || phase === "extracting" ? (
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                ) : (
                  <IconMicrophone className="h-8 w-8 text-white" />
                )}
              </button>
              <p className="mt-3 text-sm font-medium text-slate-300">
                {phase === "transcribing"
                  ? "Transcribing…"
                  : phase === "extracting"
                    ? "Extracting…"
                    : isRecording
                      ? "Tap to stop"
                      : "Tap to record"}
              </p>
              <div className="mt-4 flex h-10 w-full items-end justify-center gap-1 rounded-xl border border-white/10 bg-navy/50 px-3 py-2">
                {Array.from({ length: 20 }).map((_, index) => (
                  <span
                    key={index}
                    className={`w-1 rounded-full bg-cyan-400/80 ${
                      isRecording ? "animate-waveform" : "opacity-40"
                    }`}
                    style={{
                      height: `${20 + ((index * 17) % 60)}%`,
                      animationDelay: `${index * 0.05}s`,
                    }}
                  />
                ))}
              </div>
              <p className="mt-2 font-mono text-xl font-bold text-white">
                {formatTimer(isRecording ? seconds : 0)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <IconCheck className="h-3 w-3" />
                </span>
                Auto-stop: 2 sec silence
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-navy/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">Transcript</h3>
                <button
                  type="button"
                  onClick={() => setIsEditingTranscript((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-blue-400"
                >
                  <IconPencil className="h-3.5 w-3.5" />
                  {isEditingTranscript ? "Done" : "Edit"}
                </button>
              </div>
              {phase === "transcribing" && !transcript ? (
                <div className="mt-3 flex items-center gap-3 text-sm text-slate-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                  Transcribing…
                </div>
              ) : isEditingTranscript ? (
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  className="mt-3 min-h-[96px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent"
                  placeholder="Your transcript will appear here…"
                />
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                  {transcript || "Your transcript will appear here…"}
                </p>
              )}
              {transcript.trim() && phase !== "extracting" ? (
                <button
                  type="button"
                  onClick={() => void processTranscript(transcript.trim(), false)}
                  className="mt-3 text-xs font-semibold text-accent hover:text-blue-400"
                >
                  Re-extract materials
                </button>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-navy/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Materials ({materials.length})
                </h3>
                <span className="text-sm font-semibold text-accent">
                  {formatCurrency(materialsTotal)}
                </span>
              </div>
              {materials.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No materials extracted yet.
                </p>
              ) : (
                <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                  {materials.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 text-slate-200">
                        {item.item || "Material"}
                        {item.brand ? (
                          <span className="text-slate-500"> · {item.brand}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-slate-400">
                        {item.quantity} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={materials.length === 0 || isSending || isBusy}
                  onClick={() => setShowSupplierModal(true)}
                  className={`${touchBtnPrimary} px-4 text-sm disabled:opacity-40`}
                >
                  {isSending ? "Sending…" : "Send to Supplier"}
                </button>
                <button
                  type="button"
                  disabled={isBusy || isSending}
                  onClick={() => {
                    setTranscript("");
                    setMaterials([]);
                    setLabourItems([]);
                    setNotes("");
                    setPhase("idle");
                    setPipelineError(null);
                    setFeedback(null);
                  }}
                  className={`${touchBtnSecondary} px-4 text-sm`}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showSupplierModal ? (
        <SendToSupplierModal
          materials={materials}
          isSending={isSending}
          onClose={() => setShowSupplierModal(false)}
          onSend={handleSendToSupplier}
        />
      ) : null}
    </>
  );
}
