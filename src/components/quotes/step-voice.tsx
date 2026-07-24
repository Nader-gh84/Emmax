"use client";

import { useEffect, useRef, useState } from "react";
import { IconMicrophone } from "@/components/dashboard/icons";
import { formatTimer } from "@/types/quote";

type RecordingStatus = "idle" | "recording" | "processing";

interface StepVoiceProps {
  onComplete: (transcript: string, scopeOfWork: string, materials: unknown[]) => void;
}

export function StepVoice({ onComplete }: StepVoiceProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  async function processAudio(blob: Blob) {
    setStatus("processing");
    setError(null);

    const formData = new FormData();
    formData.append("audio", blob, "recording.webm");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process recording");
      }

      onComplete(data.transcript, data.scopeOfWork, data.materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  }

  async function processManualText() {
    if (!manualText.trim()) return;

    setStatus("processing");
    setError(null);

    const formData = new FormData();
    formData.append("text", manualText.trim());

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process text");
      }

      onComplete(data.transcript, data.scopeOfWork, data.materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
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

  const statusText =
    status === "recording"
      ? "Listening..."
      : status === "processing"
        ? "Processing with AI..."
        : "Tap to start recording";

  if (manualMode) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-xl font-semibold text-white">Type your quote details</h2>
        <p className="mt-2 text-sm text-slate-400">
          Describe materials, quantities, and scope of work.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          rows={8}
          placeholder="e.g. Need 20 amp breaker panel upgrade, 50 ft of 12/2 wire, 4 hours labour for kitchen rewire..."
          className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="rounded-lg border border-white/20 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            Back to voice
          </button>
          <button
            type="button"
            onClick={processManualText}
            disabled={!manualText.trim() || status === "processing"}
            className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "processing" ? "Processing..." : "Process with AI"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl text-center">
      <h2 className="text-xl font-semibold text-white">Record your quote</h2>
      <p className="mt-2 text-sm text-slate-400">
        Describe the job, materials, and quantities out loud.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mt-10 flex flex-col items-center">
        {status === "processing" ? (
          <div className="flex h-28 w-28 items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
          </div>
        ) : (
          <button
            type="button"
            onClick={handleMicClick}
            className={`relative flex h-28 w-28 items-center justify-center rounded-full transition ${
              status === "recording"
                ? "bg-accent shadow-lg shadow-accent/40 animate-pulse ring-4 ring-accent/30"
                : "bg-accent shadow-lg shadow-accent/25 hover:bg-blue-600"
            }`}
          >
            <IconMicrophone className="h-12 w-12 text-white" />
          </button>
        )}

        <p className="mt-6 text-sm font-medium text-slate-300">{statusText}</p>

        {status === "recording" && (
          <>
            <p className="mt-2 font-mono text-2xl font-bold text-white">
              {formatTimer(seconds)}
            </p>
            <Waveform />
          </>
        )}
      </div>

      {status === "idle" && (
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="mt-10 text-sm font-medium text-accent hover:text-blue-400"
        >
          Or type manually
        </button>
      )}
    </div>
  );
}

function Waveform() {
  return (
    <div className="mt-6 flex h-12 items-end justify-center gap-1">
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 origin-bottom rounded-full bg-accent animate-waveform"
          style={{
            animationDelay: `${i * 0.08}s`,
            height: `${30 + (i % 5) * 12}%`,
          }}
        />
      ))}
    </div>
  );
}
