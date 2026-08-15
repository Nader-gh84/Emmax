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
  silenceDurationMs?: number;
  /** Minimum speech ms to mark hasSpeech (default from whisper-guard). */
  minSpeechDurationMs?: number;
}

export function useVoiceRecorder({
  onRecordingComplete,
  silenceThreshold = 0.015,
  silenceDurationMs = 2000,
  minSpeechDurationMs = MIN_SPEECH_DURATION_MS,
}: UseVoiceRecorderOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onRecordingComplete);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechDurationMsRef = useRef(0);
  const peakRmsRef = useRef(0);
  const lastSpeechSampleAtRef = useRef<number | null>(null);

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    onCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  const stopAnalyser = useCallback(() => {
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

  const cleanupStream = useCallback(() => {
    stopAnalyser();
    clearTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, [clearTimer, stopAnalyser]);

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
    stopAnalyser();
  }, [stopAnalyser]);

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];
    speechDurationMsRef.current = 0;
    peakRmsRef.current = 0;
    lastSpeechSampleAtRef.current = null;
    setSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        cleanupStream();
        try {
          await audioContext.close();
        } catch {
          // AudioContext may already be closed.
        }

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

      const dataArray = new Uint8Array(analyser.fftSize);

      const monitorSilence = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / dataArray.length);
        const now = Date.now();

        if (volume > peakRmsRef.current) {
          peakRmsRef.current = volume;
        }

        if (volume >= silenceThreshold) {
          if (lastSpeechSampleAtRef.current != null) {
            speechDurationMsRef.current += now - lastSpeechSampleAtRef.current;
          }
          lastSpeechSampleAtRef.current = now;
          silenceStartRef.current = null;
        } else {
          lastSpeechSampleAtRef.current = null;
          if (!silenceStartRef.current) {
            silenceStartRef.current = now;
          } else if (now - silenceStartRef.current >= silenceDurationMs) {
            finishRecording();
            return;
          }
        }

        rafRef.current = requestAnimationFrame(monitorSilence);
      };

      mediaRecorder.start();
      setStatus("recording");
      rafRef.current = requestAnimationFrame(monitorSilence);
      timerRef.current = setInterval(() => {
        setSeconds((value) => value + 1);
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access.");
      setStatus("idle");
      cleanupStream();
    }
  }, [
    cleanupStream,
    finishRecording,
    minSpeechDurationMs,
    silenceDurationMs,
    silenceThreshold,
  ]);

  return {
    status,
    error,
    seconds,
    startRecording,
    stopRecording: finishRecording,
    setError,
  };
}
