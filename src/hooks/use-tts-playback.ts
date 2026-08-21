"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  claimExclusiveTts,
  registerTtsStopper,
  unlockTtsAudio,
} from "@/lib/tts-audio-bus";

export type TtsPlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "ended"
  | "error";

export type TtsPlayOptions = {
  voice?: string;
  instructions?: string;
  /**
   * When true, autoplay / network failures do not set a user-visible error.
   * Used by Projects PO confirmation (on-screen text is the fallback).
   */
  silentFail?: boolean;
};

/**
 * Fetch OpenAI TTS via `/api/tts` and play as HTMLAudioElement.
 * Caches the last generated blob for instant Replay of the same text.
 * Coordinates with other pages via the shared TTS audio bus.
 */
export function useTtsPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const cacheKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onEndedRef = useRef<() => void>(() => setStatus("ended"));
  const stopRef = useRef<() => void>(() => undefined);

  const [status, setStatus] = useState<TtsPlaybackStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    cacheKeyRef.current = null;
  }, []);

  const detachAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.removeEventListener("ended", onEndedRef.current);
      audio.pause();
    }
    audioRef.current = null;
  }, []);

  const bindAudio = useCallback(
    (audio: HTMLAudioElement) => {
      detachAudio();
      audioRef.current = audio;
      audio.addEventListener("ended", onEndedRef.current);
    },
    [detachAudio]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    setStatus((current) => {
      if (current === "loading") return "idle";
      if (urlRef.current) return "ended";
      return "idle";
    });
  }, []);

  stopRef.current = stop;

  useEffect(() => {
    const stopper = () => stopRef.current();
    return registerTtsStopper(stopper);
  }, []);

  const playCached = useCallback(async (silentFail?: boolean) => {
    if (!urlRef.current) return false;
    const audio = audioRef.current ?? new Audio(urlRef.current);
    bindAudio(audio);
    audio.currentTime = 0;
    setStatus("playing");
    try {
      await audio.play();
      return true;
    } catch {
      setStatus(silentFail ? "idle" : "error");
      if (!silentFail) {
        setError("Tap Start Brief again — the browser blocked autoplay.");
      }
      return false;
    }
  }, [bindAudio]);

  const play = useCallback(
    async (text: string, options?: TtsPlayOptions) => {
      const trimmed = text.trim();
      const silentFail = Boolean(options?.silentFail);
      if (!trimmed) {
        if (!silentFail) {
          setError("Nothing to speak — agenda brief is empty.");
          setStatus("error");
        }
        return;
      }

      // Keep user-gesture unlock warm when play is called from a click path
      unlockTtsAudio();
      claimExclusiveTts(() => stopRef.current());

      setError(null);

      if (cacheKeyRef.current === trimmed && urlRef.current) {
        await playCached(silentFail);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      detachAudio();
      revokeUrl();
      setStatus("loading");

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            voice: options?.voice,
            instructions: options?.instructions,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || "Failed to generate speech");
        }

        const blob = await response.blob();
        if (controller.signal.aborted) return;

        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        cacheKeyRef.current = trimmed;

        const audio = new Audio(url);
        bindAudio(audio);
        setStatus("playing");

        try {
          await audio.play();
        } catch {
          setStatus(silentFail ? "idle" : "error");
          if (!silentFail) {
            setError("Tap Start Brief again — the browser blocked autoplay.");
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setStatus(silentFail ? "idle" : "error");
        if (!silentFail) {
          setError(
            err instanceof Error ? err.message : "Failed to play Daily Brief"
          );
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [bindAudio, detachAudio, playCached, revokeUrl]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      const audio = audioRef.current;
      if (audio) {
        audio.removeEventListener("ended", onEndedRef.current);
        audio.pause();
      }
      audioRef.current = null;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
  }, []);

  return {
    status,
    error,
    play,
    stop,
    unlock: unlockTtsAudio,
    isLoading: status === "loading",
    isPlaying: status === "playing",
  };
}
