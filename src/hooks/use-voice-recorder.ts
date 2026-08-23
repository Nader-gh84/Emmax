"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MIN_SPEECH_DURATION_MS } from "@/lib/whisper-guard";

type RecorderStatus = "idle" | "recording";

export type VoiceRecordingMeta = {
  /** Accumulated ms where RMS was above the speech threshold. */
  speechDurationMs: number;
  peakRms: number;
  /** True when there was enough non-silent audio to bother Whisper. */
  hasSpeech: boolean;
};

interface UseVoiceRecorderOptions {
  onRecordingComplete: (
    blob: Blob,
    meta: VoiceRecordingMeta
  ) => void | Promise<void>;
  silenceThreshold?: number;
  /**
   * How long to wait with no speech before giving up (user hasn't started).
   * Default ~7s so people can gather thoughts.
   */
  preSpeechSilenceMs?: number;
  /**
   * After real speech was detected, how long a pause ends the utterance.
   * Default ~1.5s for responsive turn-taking.
   */
  postSpeechSilenceMs?: number;
  /** @deprecated Prefer preSpeechSilenceMs / postSpeechSilenceMs. */
  silenceDurationMs?: number;
  /** Minimum speech ms to mark hasSpeech (default from whisper-guard). */
  minSpeechDurationMs?: number;
  /** Number of live waveform bars to expose (default 7). */
  barCount?: number;
  /**
   * When true, recording ends only when the user calls stopRecording().
   * Silence-based auto-stop is disabled (Projects materials capture).
   */
  manualStopOnly?: boolean;
  /**
   * Dynamic override read each monitor frame. Prefer this when silence
   * mode can change between dictation and conversational turns.
   * When provided, takes precedence over `manualStopOnly`.
   */
  getManualStopOnly?: () => boolean;
}

const DEFAULT_PRE_SPEECH_SILENCE_MS = 7000;
const DEFAULT_POST_SPEECH_SILENCE_MS = 1500;
const DEFAULT_BAR_COUNT = 7;
/** EMA factor for bar height smoothing (higher = smoother / less flicker). */
const LEVEL_SMOOTHING = 0.72;

function flatLevels(count: number, value = 0.04): number[] {
  return Array.from({ length: count }, () => value);
}

export function useVoiceRecorder({
  onRecordingComplete,
  silenceThreshold = 0.015,
  preSpeechSilenceMs,
  postSpeechSilenceMs,
  silenceDurationMs,
  minSpeechDurationMs = MIN_SPEECH_DURATION_MS,
  barCount = DEFAULT_BAR_COUNT,
  manualStopOnly = false,
  getManualStopOnly,
}: UseVoiceRecorderOptions) {
  const resolvedPreSpeech =
    preSpeechSilenceMs ?? silenceDurationMs ?? DEFAULT_PRE_SPEECH_SILENCE_MS;
  const resolvedPostSpeech =
    postSpeechSilenceMs ??
    (silenceDurationMs != null
      ? Math.min(silenceDurationMs, DEFAULT_POST_SPEECH_SILENCE_MS)
      : DEFAULT_POST_SPEECH_SILENCE_MS);

  const manualStopOnlyRef = useRef(manualStopOnly);
  manualStopOnlyRef.current = manualStopOnly;
  const getManualStopOnlyRef = useRef(getManualStopOnly);
  getManualStopOnlyRef.current = getManualStopOnly;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onRecordingComplete);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechDurationMsRef = useRef(0);
  const peakRmsRef = useRef(0);
  const lastSpeechSampleAtRef = useRef<number | null>(null);
  const heardSpeechRef = useRef(false);
  const smoothedLevelsRef = useRef<number[]>(flatLevels(barCount));

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => flatLevels(barCount));

  useEffect(() => {
    onCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  useEffect(() => {
    smoothedLevelsRef.current = flatLevels(barCount);
    setLevels(flatLevels(barCount));
  }, [barCount]);

  const stopAnalyserLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    silenceStartRef.current = null;
    lastSpeechSampleAtRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const disconnectAudioGraph = useCallback(() => {
    try {
      sourceNodeRef.current?.disconnect();
    } catch {
      // already disconnected
    }
    try {
      analyserRef.current?.disconnect();
    } catch {
      // already disconnected
    }
    sourceNodeRef.current = null;
    analyserRef.current = null;

    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    if (ctx) {
      void ctx.close().catch(() => undefined);
    }
  }, []);

  const cleanupStream = useCallback(() => {
    stopAnalyserLoop();
    clearTimer();
    disconnectAudioGraph();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    smoothedLevelsRef.current = flatLevels(barCount);
    setLevels(flatLevels(barCount));
  }, [barCount, clearTimer, disconnectAudioGraph, stopAnalyserLoop]);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [cleanupStream]);

  const finishRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.stop();
    stopAnalyserLoop();
  }, [stopAnalyserLoop]);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    speechDurationMsRef.current = 0;
    peakRmsRef.current = 0;
    lastSpeechSampleAtRef.current = null;
    heardSpeechRef.current = false;
    smoothedLevelsRef.current = flatLevels(barCount);
    setLevels(flatLevels(barCount));
    setSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.65;
      analyserRef.current = analyser;
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        cleanupStream();
        setStatus("idle");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const speechDurationMs = speechDurationMsRef.current;
        const peakRms = peakRmsRef.current;
        const meta: VoiceRecordingMeta = {
          speechDurationMs,
          peakRms,
          hasSpeech: speechDurationMs >= minSpeechDurationMs,
        };
        if (blob.size > 0) {
          await onCompleteRef.current(blob, meta);
        }
      };

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);

      const monitor = () => {
        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i += 1) {
          const normalized = (timeData[i]! - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / timeData.length);
        const now = Date.now();

        if (volume > peakRmsRef.current) {
          peakRmsRef.current = volume;
        }

        // Live waveform bars from frequency bins (speech band–weighted)
        analyser.getByteFrequencyData(freqData);
        const usableBins = Math.floor(freqData.length * 0.45);
        const chunk = Math.max(1, Math.floor(usableBins / barCount));
        const next = smoothedLevelsRef.current.slice();
        for (let bar = 0; bar < barCount; bar += 1) {
          const start = bar * chunk;
          let bucket = 0;
          for (let j = 0; j < chunk; j += 1) {
            bucket += freqData[start + j] ?? 0;
          }
          const raw = Math.min(1, bucket / (chunk * 255));
          // Soft gate: near-silence collapses toward a flat floor
          const gated = raw < 0.045 ? 0.03 : Math.pow(raw, 0.85);
          next[bar] =
            next[bar]! * LEVEL_SMOOTHING + gated * (1 - LEVEL_SMOOTHING);
        }
        smoothedLevelsRef.current = next;
        setLevels(next.slice());

        const isManualStopOnly =
          getManualStopOnlyRef.current?.() ?? manualStopOnlyRef.current;

        if (volume >= silenceThreshold) {
          if (lastSpeechSampleAtRef.current != null) {
            speechDurationMsRef.current += now - lastSpeechSampleAtRef.current;
          }
          lastSpeechSampleAtRef.current = now;
          if (speechDurationMsRef.current >= minSpeechDurationMs) {
            heardSpeechRef.current = true;
          }
          silenceStartRef.current = null;
        } else if (!isManualStopOnly) {
          lastSpeechSampleAtRef.current = null;
          if (!silenceStartRef.current) {
            silenceStartRef.current = now;
          } else {
            const silenceFor = now - silenceStartRef.current;
            const limit = heardSpeechRef.current
              ? resolvedPostSpeech
              : resolvedPreSpeech;
            if (silenceFor >= limit) {
              finishRecording();
              return;
            }
          }
        } else {
          lastSpeechSampleAtRef.current = null;
        }

        rafRef.current = requestAnimationFrame(monitor);
      };

      mediaRecorder.start();
      setStatus("recording");
      rafRef.current = requestAnimationFrame(monitor);
      timerRef.current = setInterval(() => {
        setSeconds((value) => value + 1);
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access.");
      setStatus("idle");
      cleanupStream();
    }
  }, [
    barCount,
    cleanupStream,
    finishRecording,
    minSpeechDurationMs,
    resolvedPostSpeech,
    resolvedPreSpeech,
    silenceThreshold,
  ]);

  return {
    status,
    error,
    seconds,
    /** Smoothed 0–1 bar heights; live while recording, flat when idle. */
    levels,
    startRecording,
    stopRecording: finishRecording,
    setError,
  };
}
