"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "processing";

interface UseVoiceRecorderOptions {
  onRecordingComplete: (blob: Blob) => void | Promise<void>;
  silenceThreshold?: number;
  silenceDurationMs?: number;
  autoStopOnSilence?: boolean;
}

function getMicErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Microphone access denied.";
    }
    if (error.name === "AbortError") {
      return "Microphone request was interrupted. Tap to answer to try again.";
    }
  }

  return "Microphone access denied.";
}

export function useVoiceRecorder({
  onRecordingComplete,
  silenceThreshold = 0.015,
  silenceDurationMs = 1800,
  autoStopOnSilence = true,
}: UseVoiceRecorderOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const statusRef = useRef<RecorderStatus>("idle");
  const onCompleteRef = useRef(onRecordingComplete);

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  statusRef.current = status;

  useEffect(() => {
    onCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  const stopAnalyser = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    silenceStartRef.current = null;
  }, []);

  const cleanupStream = useCallback(() => {
    stopAnalyser();
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, [stopAnalyser]);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      startingRef.current = false;
    };
  }, [cleanupStream]);

  const finishRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    recorder.stop();
    stopAnalyser();
  }, [stopAnalyser]);

  const startRecording = useCallback(async () => {
    if (
      startingRef.current ||
      statusRef.current === "recording" ||
      statusRef.current === "processing"
    ) {
      return;
    }

    startingRef.current = true;
    setError(null);
    chunksRef.current = [];
    setSeconds(0);

    let audioContext: AudioContext | null = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContext = new AudioContext();
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
        if (audioContext) {
          await audioContext.close();
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          setStatus("processing");
          try {
            await onCompleteRef.current(blob);
          } finally {
            setStatus("idle");
          }
        } else {
          setStatus("idle");
        }
      };

      const dataArray = new Uint8Array(analyser.fftSize);

      const monitorSilence = () => {
        if (!autoStopOnSilence) return;

        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const volume = Math.sqrt(sum / dataArray.length);

        if (volume < silenceThreshold) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (
            Date.now() - silenceStartRef.current >= silenceDurationMs
          ) {
            finishRecording();
            return;
          }
        } else {
          silenceStartRef.current = null;
        }

        rafRef.current = requestAnimationFrame(monitorSilence);
      };

      mediaRecorder.start();
      setStatus("recording");
      if (autoStopOnSilence) {
        rafRef.current = requestAnimationFrame(monitorSilence);
      }

      timerRef.current = window.setInterval(() => {
        setSeconds((value) => value + 1);
      }, 1000);
    } catch (err) {
      cleanupStream();
      if (audioContext) {
        await audioContext.close().catch(() => undefined);
      }
      setError(getMicErrorMessage(err));
      setStatus("idle");
      throw err;
    } finally {
      startingRef.current = false;
    }
  }, [
    autoStopOnSilence,
    cleanupStream,
    finishRecording,
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
    setStatus,
  };
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to transcribe audio");
  }

  return data.transcript ?? "";
}

export async function transcribeText(text: string): Promise<string> {
  const formData = new FormData();
  formData.append("text", text.trim());

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to process text");
  }

  return data.transcript ?? text.trim();
}
