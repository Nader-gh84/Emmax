"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TtsPlaybackStatus =
  | "idle"
  | "loading"
  | "playing"
  | "ended"
  | "error";

export type TtsPlayOptions = {
  voice?: string;
  instructions?: string;
};

/**
 * Fetch OpenAI TTS via `/api/tts` and play as HTMLAudioElement.
 * Caches the last generated blob for instant Replay of the same text.
 */
export function useTtsPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const cacheKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onEndedRef = useRef<() => void>(() => setStatus("ended"));

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

  const playCached = useCallback(async () => {
    if (!urlRef.current) return false;
    const audio = audioRef.current ?? new Audio(urlRef.current);
    bindAudio(audio);
    audio.currentTime = 0;
    setStatus("playing");
    try {
      await audio.play();
      return true;
    } catch {
      setStatus("error");
      setError("Tap Start Brief again — the browser blocked autoplay.");
      return false;
    }
  }, [bindAudio]);

  const play = useCallback(
    async (text: string, options?: TtsPlayOptions) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError("Nothing to speak — agenda brief is empty.");
        setStatus("error");
        return;
      }

      setError(null);

      if (cacheKeyRef.current === trimmed && urlRef.current) {
        await playCached();
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
          setStatus("error");
          setError("Tap Start Brief again — the browser blocked autoplay.");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to play Daily Brief"
        );
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
    isLoading: status === "loading",
    isPlaying: status === "playing",
  };
}
