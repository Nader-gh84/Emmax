"use client";

import { useCallback, useEffect, useRef } from "react";
import { IconMicrophone } from "@/components/dashboard/icons";
import { useEmCall } from "@/components/em-call/em-call-provider";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import {
  buildEmCallGreeting,
  EM_CALL_CHUNK0_REPLY,
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
  if (phase === "thinking") return "Got your words — one moment…";
  if (phase === "speaking") return "Ema is speaking…";
  if (phase === "closing") return "Ending call…";
  return "Em Call with Ema";
}

export function EmCallOverlay() {
  const {
    isOpen,
    phase,
    greetingName,
    transcript,
    statusMessage,
    error,
    endCall,
    setPhase,
    setTranscript,
    setStatusMessage,
    setError,
  } = useEmCall();

  const tts = useTtsPlayback();
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(0);
  const greetingRequestedRef = useRef(false);
  const listenStartedRef = useRef(false);
  const replyRequestedRef = useRef(false);
  const pendingReplyRef = useRef(false);
  const sawReplyPlayingRef = useRef(false);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const finishAndClose = useCallback(() => {
    clearCloseTimer();
    setPhase("closing");
    closeTimerRef.current = setTimeout(() => {
      endCall();
    }, 450);
  }, [clearCloseTimer, endCall, setPhase]);

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      const session = sessionRef.current;
      setPhase("thinking");
      setStatusMessage("Transcribing…");
      setError(null);

      try {
        const form = new FormData();
        form.append("audio", blob, "em-call.webm");
        form.append("extract", "false");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const data = (await response.json().catch(() => null)) as {
          transcript?: string;
          error?: string;
        } | null;

        if (session !== sessionRef.current) return;

        if (!response.ok || !data?.transcript?.trim()) {
          throw new Error(data?.error || "Couldn't catch that — try again.");
        }

        setTranscript(data.transcript.trim());
        setStatusMessage(null);
        pendingReplyRef.current = true;
        setPhase("speaking");
      } catch (err) {
        if (session !== sessionRef.current) return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setPhase("listening");
        setStatusMessage("Tap the mic to try again");
      }
    },
    [setError, setPhase, setStatusMessage, setTranscript]
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

  const handleEndCall = useCallback(() => {
    sessionRef.current += 1;
    clearCloseTimer();
    greetingRequestedRef.current = false;
    listenStartedRef.current = false;
    replyRequestedRef.current = false;
    pendingReplyRef.current = false;
    sawReplyPlayingRef.current = false;
    tts.stop();
    if (recorderStatus === "recording") {
      void stopRecording();
    }
    endCall();
  }, [clearCloseTimer, endCall, recorderStatus, stopRecording, tts]);

  // Open → kick off greeting TTS
  useEffect(() => {
    if (!isOpen) {
      greetingRequestedRef.current = false;
      listenStartedRef.current = false;
      replyRequestedRef.current = false;
      pendingReplyRef.current = false;
      sawReplyPlayingRef.current = false;
      clearCloseTimer();
      tts.stop();
      return;
    }

    if (greetingRequestedRef.current) return;
    greetingRequestedRef.current = true;
    sessionRef.current += 1;
    setPhase("greeting");
    setStatusMessage(null);
    void tts.play(buildEmCallGreeting(greetingName), {
      voice: EM_CALL_TTS_VOICE,
      instructions: EM_CALL_TTS_INSTRUCTIONS,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per open
  }, [isOpen]);

  // Greeting finished → start listening
  useEffect(() => {
    if (!isOpen) return;
    if (phase !== "greeting") return;
    if (tts.status !== "ended" && tts.status !== "error") return;
    if (listenStartedRef.current) return;

    listenStartedRef.current = true;
    setPhase("listening");
    void (async () => {
      try {
        await startRecording();
      } catch {
        setStatusMessage("Tap the mic to speak");
      }
    })();
  }, [isOpen, phase, setPhase, setStatusMessage, startRecording, tts.status]);

  // After transcript → play canned reply
  useEffect(() => {
    if (!isOpen) return;
    if (phase !== "speaking") return;
    if (!pendingReplyRef.current) return;
    if (replyRequestedRef.current) return;

    replyRequestedRef.current = true;
    pendingReplyRef.current = false;
    sawReplyPlayingRef.current = false;
    void tts.play(EM_CALL_CHUNK0_REPLY, {
      voice: EM_CALL_TTS_VOICE,
      instructions: EM_CALL_TTS_INSTRUCTIONS,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, phase]);

  // Track reply playback then close when it finishes (not leftover greeting "ended")
  useEffect(() => {
    if (!isOpen) return;
    if (phase !== "speaking") return;
    if (!replyRequestedRef.current) return;

    if (tts.isLoading || tts.isPlaying) {
      sawReplyPlayingRef.current = true;
      return;
    }

    if (sawReplyPlayingRef.current && tts.status === "ended") {
      finishAndClose();
    }
  }, [finishAndClose, isOpen, phase, tts.isLoading, tts.isPlaying, tts.status]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleEndCall();
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
    if (tts.isPlaying || tts.isLoading) {
      tts.stop();
    }
    if (isRecording) {
      await stopRecording();
      return;
    }
    setError(null);
    setTranscript(null);
    replyRequestedRef.current = false;
    pendingReplyRef.current = false;
    sawReplyPlayingRef.current = false;
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
            “{transcript}”
          </p>
        ) : null}
        {error || recorderError ? (
          <p className="mt-3 text-sm text-red-300">{error || recorderError}</p>
        ) : null}

        <div className="mt-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => void onMicClick()}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition ${
              isRecording
                ? "bg-rose-500 shadow-rose-500/40 ring-4 ring-rose-400/30"
                : "bg-accent shadow-accent/30 hover:bg-blue-600"
            }`}
            aria-label={isRecording ? "Stop listening" : "Start speaking"}
          >
            <IconMicrophone className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={handleEndCall}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            End call
          </button>
        </div>
      </div>
    </div>
  );
}
