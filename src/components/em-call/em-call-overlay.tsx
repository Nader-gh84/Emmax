"use client";

import { useCallback, useEffect, useRef } from "react";
import { IconMicrophone } from "@/components/dashboard/icons";
import { useEmCall } from "@/components/em-call/em-call-provider";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import {
  EM_CALL_TTS_INSTRUCTIONS,
  EM_CALL_TTS_VOICE,
} from "@/lib/em-call/greeting";

function VoiceWave({ active }: { active: boolean }) {
  return (
    <div
      className="flex h-10 items-end justify-center gap-1"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-cyan-300/90 ${
            active ? "em-call-wave" : "h-2 opacity-40"
          }`}
          style={
            active
              ? {
                  animationDelay: `${i * 0.08}s`,
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}

function phaseLabel(
  phase: string,
  isRecording: boolean,
  ttsLoading: boolean
): string {
  if (phase === "greeting" || (phase === "speaking" && ttsLoading)) {
    return "Ema is speaking…";
  }
  if (phase === "listening" || isRecording) return "Listening…";
  if (phase === "thinking") return "Thinking…";
  if (phase === "speaking") return "Ema is speaking…";
  if (phase === "closing") return "Ending call…";
  return "Em Call with Ema";
}

export function EmCallOverlay() {
  const {
    isOpen,
    phase,
    sessionId,
    transcript,
    assistantLine,
    statusMessage,
    error,
    endCall,
    setPhase,
    setSessionId,
    setTranscript,
    setAssistantLine,
    setStatusMessage,
    setError,
  } = useEmCall();

  const tts = useTtsPlayback();
  const sessionLocalRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const bootstrapRequestedRef = useRef(false);
  const listenAfterSpeechRef = useRef(false);
  const sawSpeechPlayingRef = useRef(false);
  const pendingSpeakTextRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const beginListening = useCallback(
    async (startRec: () => Promise<void>) => {
      setPhase("listening");
      setStatusMessage(null);
      try {
        await startRec();
      } catch {
        setStatusMessage("Tap the mic to speak");
      }
    },
    [setPhase, setStatusMessage]
  );

  const speakLine = useCallback(
    (text: string) => {
      pendingSpeakTextRef.current = text;
      sawSpeechPlayingRef.current = false;
      listenAfterSpeechRef.current = true;
      setAssistantLine(text);
      setPhase("speaking");
      void tts.play(text, {
        voice: EM_CALL_TTS_VOICE,
        instructions: EM_CALL_TTS_INSTRUCTIONS,
      });
    },
    [setAssistantLine, setPhase, tts]
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      const local = sessionLocalRef.current;
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId) {
        setError("Call session missing — end and start again.");
        setPhase("listening");
        return;
      }

      setPhase("thinking");
      setStatusMessage("Transcribing…");
      setError(null);

      try {
        const form = new FormData();
        form.append("audio", blob, "em-call.webm");
        form.append("extract", "false");

        const sttResponse = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const sttData = (await sttResponse.json().catch(() => null)) as {
          transcript?: string;
          error?: string;
        } | null;

        if (local !== sessionLocalRef.current) return;

        if (!sttResponse.ok || !sttData?.transcript?.trim()) {
          throw new Error(sttData?.error || "Couldn't catch that — try again.");
        }

        const text = sttData.transcript.trim();
        setTranscript(text);
        setStatusMessage("Thinking…");

        const turnResponse = await fetch("/api/em-call/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: activeSessionId,
            transcript: text,
          }),
        });
        const turnData = (await turnResponse.json().catch(() => null)) as {
          reply?: string;
          error?: string;
        } | null;

        if (local !== sessionLocalRef.current) return;

        if (!turnResponse.ok || !turnData?.reply?.trim()) {
          throw new Error(turnData?.error || "Ema couldn't reply just now.");
        }

        setStatusMessage(null);
        speakLine(turnData.reply.trim());
      } catch (err) {
        if (local !== sessionLocalRef.current) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("listening");
        setStatusMessage("Tap the mic to try again");
      }
    },
    [setError, setPhase, setStatusMessage, setTranscript, speakLine]
  );

  const {
    status: recorderStatus,
    startRecording,
    stopRecording,
    error: recorderError,
  } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
    silenceDurationMs: 2200,
  });

  const isRecording = recorderStatus === "recording";

  const handleEndCall = useCallback(async () => {
    sessionLocalRef.current += 1;
    bootstrapRequestedRef.current = false;
    listenAfterSpeechRef.current = false;
    sawSpeechPlayingRef.current = false;
    pendingSpeakTextRef.current = null;
    tts.stop();

    if (recorderStatus === "recording") {
      void stopRecording();
    }

    const id = sessionIdRef.current;
    if (id) {
      void fetch("/api/em-call/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      }).catch(() => undefined);
    }

    endCall();
  }, [endCall, recorderStatus, stopRecording, tts]);
  // Bootstrap session + greeting when overlay opens
  useEffect(() => {
    if (!isOpen) {
      bootstrapRequestedRef.current = false;
      listenAfterSpeechRef.current = false;
      sawSpeechPlayingRef.current = false;
      pendingSpeakTextRef.current = null;
      tts.stop();
      return;
    }

    if (bootstrapRequestedRef.current) return;
    bootstrapRequestedRef.current = true;
    sessionLocalRef.current += 1;
    const local = sessionLocalRef.current;

    setPhase("greeting");
    setStatusMessage("Connecting…");
    setError(null);
    setTranscript(null);
    setAssistantLine(null);

    void (async () => {
      try {
        const response = await fetch("/api/em-call/session", {
          method: "POST",
        });
        const data = (await response.json().catch(() => null)) as {
          sessionId?: string;
          greeting?: string;
          error?: string;
        } | null;

        if (local !== sessionLocalRef.current) return;

        if (!response.ok || !data?.sessionId || !data.greeting) {
          throw new Error(data?.error || "Couldn't start Em Call.");
        }

        setSessionId(data.sessionId);
        sessionIdRef.current = data.sessionId;
        setStatusMessage(null);
        speakLine(data.greeting);
      } catch (err) {
        if (local !== sessionLocalRef.current) return;
        setError(err instanceof Error ? err.message : "Couldn't start Em Call");
        setStatusMessage("Tap End call and try again");
        setPhase("idle");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per open
  }, [isOpen]);

  // After Ema finishes speaking → listen again (multi-turn)
  useEffect(() => {
    if (!isOpen) return;
    if (phase !== "greeting" && phase !== "speaking") return;
    if (!listenAfterSpeechRef.current) return;

    if (tts.isLoading || tts.isPlaying) {
      sawSpeechPlayingRef.current = true;
      return;
    }

    if (!sawSpeechPlayingRef.current) return;
    if (tts.status !== "ended" && tts.status !== "error") return;

    listenAfterSpeechRef.current = false;
    sawSpeechPlayingRef.current = false;
    pendingSpeakTextRef.current = null;
    void beginListening(startRecording);
  }, [
    beginListening,
    isOpen,
    phase,
    startRecording,
    tts.isLoading,
    tts.isPlaying,
    tts.status,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void handleEndCall();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleEndCall, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const onMicClick = async () => {
    if (!isOpen) return;

    // Interrupt TTS and take the floor
    if (tts.isPlaying || tts.isLoading) {
      tts.stop();
      listenAfterSpeechRef.current = false;
      sawSpeechPlayingRef.current = false;
      pendingSpeakTextRef.current = null;
    }

    if (isRecording) {
      await stopRecording();
      return;
    }

    if (phase === "thinking") return;

    setError(null);
    setTranscript(null);
    setPhase("listening");
    await startRecording();
  };

  if (!isOpen) return null;

  const label = phaseLabel(phase, isRecording, tts.isLoading);
  const waveActive =
    isRecording ||
    phase === "listening" ||
    phase === "greeting" ||
    phase === "speaking";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="Em Call with Ema"
    >
      <div
        className="absolute inset-0 bg-[#08111f]/70 backdrop-blur-md"
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300/90">
          Em Call with Ema
        </p>

        <div className="relative mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Emmax.png"
            alt="Ema"
            className="mx-auto h-[min(52vh,420px)] w-auto max-w-full object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
          />
          <div className="pointer-events-none absolute bottom-[18%] left-1/2 w-40 -translate-x-1/2 sm:bottom-[20%]">
            <VoiceWave active={waveActive} />
          </div>
        </div>

        <p className="mt-2 text-sm font-medium text-slate-200">{label}</p>
        {statusMessage ? (
          <p className="mt-1 text-xs text-slate-400">{statusMessage}</p>
        ) : null}
        {transcript ? (
          <p className="mt-3 max-w-md rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm leading-relaxed text-white/90">
            You: “{transcript}”
          </p>
        ) : null}
        {assistantLine && phase !== "greeting" ? (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-cyan-100/90">
            Ema: {assistantLine}
          </p>
        ) : null}
        {error || recorderError ? (
          <p className="mt-3 text-sm text-red-300">{error || recorderError}</p>
        ) : null}

        <div className="mt-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => void onMicClick()}
            disabled={phase === "thinking"}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition disabled:opacity-50 ${
              isRecording
                ? "bg-rose-500 shadow-rose-500/40 ring-4 ring-rose-400/30"
                : "bg-accent shadow-accent/30 hover:bg-blue-600"
            }`}
            aria-label={
              isRecording
                ? "Stop listening"
                : tts.isPlaying || tts.isLoading
                  ? "Interrupt and speak"
                  : "Start speaking"
            }
          >
            <IconMicrophone className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => void handleEndCall()}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            End call
          </button>
        </div>
      </div>
    </div>
  );
}
