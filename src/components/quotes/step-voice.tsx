"use client";

import { useEffect, useRef, useState } from "react";
import { IconMicrophone } from "@/components/dashboard/icons";
import { QuoteLivePreview } from "@/components/quotes/quote-live-preview";
import { touchBtnPrimary, touchBtnSecondary, touchTextarea } from "@/components/quotes/ui";
import { MaterialItem, formatTimer } from "@/types/quote";

type RecordingStatus = "idle" | "recording" | "processing";

interface StepVoiceProps {
  materials: MaterialItem[];
  taxRate: number;
  transcript: string;
  processed: boolean;
  onProcessed: (
    transcript: string,
    scopeOfWork: string,
    materials: unknown[]
  ) => void;
  onContinue: () => void;
}

export function StepVoice({
  materials,
  taxRate,
  transcript,
  processed,
  onProcessed,
  onContinue,
}: StepVoiceProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [localTranscript, setLocalTranscript] = useState(transcript);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLocalTranscript(transcript);
  }, [transcript]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  async function processTranscription(
    formData: FormData,
    source: "manual" | "audio" = "audio"
  ) {
    setStatus("processing");
    setError(null);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      let data: {
        error?: string;
        transcript?: string;
        scopeOfWork?: string;
        materials?: unknown[];
      };

      try {
        data = await response.json();
      } catch (parseError) {
        console.error(
          `[StepVoice] Failed to parse /api/transcribe response (${source}):`,
          parseError
        );
        throw new Error("Invalid response from server.");
      }

      if (!response.ok) {
        console.error(`[StepVoice] /api/transcribe failed (${source}):`, {
          status: response.status,
          data,
        });
        throw new Error(data.error || "Failed to process");
      }

      const nextTranscript =
        typeof data.transcript === "string" ? data.transcript : "";
      const scopeOfWork =
        typeof data.scopeOfWork === "string" ? data.scopeOfWork : "";
      const extractedMaterials = Array.isArray(data.materials)
        ? data.materials
        : [];

      if (!nextTranscript) {
        console.error(
          `[StepVoice] /api/transcribe returned empty transcript (${source}):`,
          data
        );
        throw new Error("No transcript returned from processing.");
      }

      setLocalTranscript(nextTranscript);
      onProcessed(nextTranscript, scopeOfWork, extractedMaterials);

      if (source === "manual") {
        setManualMode(false);
      }
    } catch (err) {
      console.error(`[StepVoice] Transcribe error (${source}):`, err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  }

  async function processAudio(blob: Blob) {
    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");
    await processTranscription(formData);
  }

  async function processManualText() {
    if (!manualText.trim()) return;
    const formData = new FormData();
    formData.append("text", manualText.trim());
    await processTranscription(formData, "manual");
  }

  async function startRecording() {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          processAudio(blob);
        } else {
          setStatus("idle");
        }
      };

      mediaRecorder.start();
      setStatus("recording");
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access.");
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }

  function handleMicClick() {
    if (status === "processing") return;
    if (status === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  }

  const controls = manualMode ? (
    <ManualEntry
      manualText={manualText}
      setManualText={setManualText}
      error={error}
      status={status}
      processed={processed}
      localTranscript={localTranscript}
      onBack={() => setManualMode(false)}
      onSubmit={processManualText}
      onContinue={onContinue}
    />
  ) : (
    <RecordingControls
      status={status}
      seconds={seconds}
      error={error}
      processed={processed}
      localTranscript={localTranscript}
      onMicClick={handleMicClick}
      onManual={() => setManualMode(true)}
      onContinue={onContinue}
    />
  );

  return (
    <div className="min-w-0">
      {/* Mobile: preview on top when processed, controls below */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Live preview — shown first on mobile after processing, always on desktop left */}
        <div
          className={`min-w-0 ${
            processed ? "order-1 lg:order-none" : "hidden lg:block"
          }`}
        >
          <QuoteLivePreview
            materials={materials}
            taxRate={taxRate}
            isPlaceholder={!processed}
          />
        </div>

        {/* Recording controls */}
        <div className="order-2 flex min-w-0 flex-col lg:order-none">
          {!processed && (
            <div className="mb-4 lg:hidden">
              <QuoteLivePreview
                materials={materials}
                taxRate={taxRate}
                isPlaceholder
              />
            </div>
          )}
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 sm:px-8">
            {controls}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordingControls({
  status,
  seconds,
  error,
  processed,
  localTranscript,
  onMicClick,
  onManual,
  onContinue,
}: {
  status: RecordingStatus;
  seconds: number;
  error: string | null;
  processed: boolean;
  localTranscript: string;
  onMicClick: () => void;
  onManual: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <h2 className="text-xl font-semibold text-white sm:text-2xl">
        {processed ? "Quote captured" : "Record your quote"}
      </h2>
      <p className="mt-2 text-base text-slate-400">
        {processed
          ? "Review the transcript, then continue."
          : "Describe materials, quantities, and scope of work."}
      </p>

      {error && (
        <div className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
          {error}
        </div>
      )}

      {!processed && (
        <>
          <div className="mt-8 flex flex-col items-center">
            {status === "processing" ? (
              <div className="flex h-32 w-32 items-center justify-center">
                <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
              </div>
            ) : (
              <button
                type="button"
                onClick={onMicClick}
                aria-label={
                  status === "recording" ? "Stop recording" : "Start recording"
                }
                className={`relative flex h-32 w-32 items-center justify-center rounded-full transition ${
                  status === "recording"
                    ? "animate-pulse bg-accent shadow-xl shadow-accent/40 ring-4 ring-accent/30"
                    : "bg-accent shadow-xl shadow-accent/25 hover:bg-blue-600 active:scale-95"
                }`}
              >
                <IconMicrophone className="h-14 w-14 text-white" />
              </button>
            )}

            <StatusLine status={status} />

            {status === "recording" && (
              <>
                <p className="mt-3 font-mono text-3xl font-bold text-white">
                  {formatTimer(seconds)}
                </p>
                <Waveform />
              </>
            )}
          </div>

          {status === "idle" && (
            <button
              type="button"
              onClick={onManual}
              className="mt-8 min-h-[44px] text-base font-medium text-accent hover:text-blue-400"
            >
              Or type manually
            </button>
          )}
        </>
      )}

      {(processed || localTranscript) && (
        <div className="mt-6 w-full animate-fade-in">
          <p className="mb-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            Transcript
          </p>
          <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-navy/50 p-4 text-left text-base leading-relaxed text-slate-300">
            {localTranscript || "Processing..."}
          </div>
          {processed && (
            <button
              type="button"
              onClick={onContinue}
              className={`${touchBtnPrimary} mt-6 w-full`}
            >
              Continue to Materials
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusLine({ status }: { status: RecordingStatus }) {
  if (status === "recording") {
    return (
      <div className="mt-5 flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-red-500" />
        <p className="text-base font-medium text-white">Listening...</p>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <p className="mt-5 text-base font-medium text-slate-300">
        Processing with AI...
      </p>
    );
  }

  return (
    <p className="mt-5 text-base font-medium text-slate-300">
      Tap to start recording
    </p>
  );
}

function Waveform() {
  return (
    <div className="mt-5 flex h-10 items-end justify-center gap-1.5">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="w-2 origin-bottom rounded-full bg-accent animate-waveform"
          style={{
            animationDelay: `${i * 0.1}s`,
            height: `${40 + (i % 3) * 20}%`,
          }}
        />
      ))}
    </div>
  );
}

function ManualEntry({
  manualText,
  setManualText,
  error,
  status,
  processed,
  localTranscript,
  onBack,
  onSubmit,
  onContinue,
}: {
  manualText: string;
  setManualText: (v: string) => void;
  error: string | null;
  status: RecordingStatus;
  processed: boolean;
  localTranscript: string;
  onBack: () => void;
  onSubmit: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="w-full max-w-md text-center">
      <h2 className="text-xl font-semibold text-white">
        {processed ? "Quote captured" : "Type your quote"}
      </h2>
      <p className="mt-2 text-base text-slate-400">
        {processed
          ? "Review the transcript, then continue."
          : "Describe materials, quantities, and scope of work."}
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
          {error}
        </div>
      )}

      {!processed && (
        <>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={6}
            placeholder="e.g. Panel upgrade, 50 ft of 12/2 wire, 4 hours labour..."
            className={`${touchTextarea} mt-6 text-left`}
          />

          <div className="mt-6 flex flex-col gap-3">
            <button type="button" onClick={onBack} className={`${touchBtnSecondary} w-full`}>
              Back to voice
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!manualText.trim() || status === "processing"}
              className={`${touchBtnPrimary} w-full`}
            >
              {status === "processing" ? "Processing with AI..." : "Process with AI"}
            </button>
          </div>
        </>
      )}

      {processed && (
        <div className="mt-6 w-full animate-fade-in text-left">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Transcript
          </p>
          <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-navy/50 p-4 text-base leading-relaxed text-slate-300">
            {localTranscript}
          </div>
          <button
            type="button"
            onClick={onContinue}
            className={`${touchBtnPrimary} mt-6 w-full`}
          >
            Continue to Materials
          </button>
        </div>
      )}
    </div>
  );
}
