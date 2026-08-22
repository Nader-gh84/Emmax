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

function ttsLog(
  event: string,
  data?: Record<string, unknown>
): void {
  if (data) {
    console.info(`[tts] ${event}`, data);
  } else {
    console.info(`[tts] ${event}`);
  }
}

function waitForCanPlay(
  audio: HTMLAudioElement,
  signal: AbortSignal,
  timeoutMs = 8000
): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };
    const onReady = () => finish(() => resolve());
    const onError = () =>
      finish(() => reject(new Error("Audio source failed to load")));
    const onAbort = () =>
      finish(() => reject(new DOMException("Aborted", "AbortError")));
    const onTimeout = () =>
      finish(() => reject(new Error("Timed out waiting for audio to load")));

    const cleanup = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
      window.clearTimeout(timeoutId);
    };

    const timeoutId = window.setTimeout(onTimeout, timeoutMs);
    audio.addEventListener("canplay", onReady);
    audio.addEventListener("loadeddata", onReady);
    audio.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort);

    // Kick load in case the browser deferred it.
    try {
      audio.load();
    } catch {
      // ignore
    }

    // Re-check after attaching listeners (canplay may have already fired).
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      onReady();
    }
  });
}

/**
 * Fetch OpenAI TTS via `/api/tts` and play as HTMLAudioElement.
 * Reuses one Audio element per hook instance so the first gesture-unlocked
 * play keeps subsequent plays allowed. Caches the last blob for Replay.
 */
export function useTtsPlayback() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const assignedSrcRef = useRef<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const cacheKeyRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const playGenerationRef = useRef(0);
  const stopRef = useRef<() => void>(() => undefined);
  /** Stable identity for the TTS bus — must match claimExclusiveTts(self). */
  const stopperRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<TtsPlaybackStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;

    const audio = new Audio();
    audio.preload = "auto";

    audio.addEventListener("ended", () => {
      ttsLog("ended", { src: audio.src?.slice(0, 48) });
      setStatus("ended");
    });

    audio.addEventListener("error", () => {
      const mediaError = audio.error;
      ttsLog("element error", {
        code: mediaError?.code,
        message: mediaError?.message,
      });
      setStatus((current) =>
        current === "loading" || current === "playing" ? "error" : current
      );
      setError((prev) => prev ?? "Audio playback failed");
    });

    audioRef.current = audio;
    return audio;
  }, []);

  const stop = useCallback(() => {
    ttsLog("stop");
    playGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    }

    // Explicit stop → idle (not ended) so callers don't treat interrupt as success.
    setStatus("idle");
  }, []);

  stopRef.current = stop;

  if (!stopperRef.current) {
    stopperRef.current = () => stopRef.current();
  }

  useEffect(() => {
    return registerTtsStopper(stopperRef.current!);
  }, []);

  const playSrc = useCallback(
    async (
      url: string,
      silentFail: boolean,
      signal: AbortSignal,
      generation: number
    ): Promise<boolean> => {
      const audio = ensureAudio();

      if (assignedSrcRef.current !== url) {
        audio.src = url;
        assignedSrcRef.current = url;
      }

      try {
        audio.currentTime = 0;
      } catch {
        // ignore until metadata is ready
      }

      ttsLog("waiting canplay", {
        url: url.slice(0, 48),
        readyState: audio.readyState,
      });
      await waitForCanPlay(audio, signal);
      if (signal.aborted || generation !== playGenerationRef.current) {
        ttsLog("play aborted before start");
        setStatus("idle");
        return false;
      }

      setStatus("playing");
      ttsLog("play() called", { url: url.slice(0, 48) });

      try {
        await audio.play();
        // If something else paused us immediately (legacy unlock race), fail honest.
        if (audio.paused) {
          ttsLog("play() resolved but element is paused");
          setStatus(silentFail ? "idle" : "error");
          if (!silentFail) {
            setError("Playback was interrupted before audio could start.");
          }
          return false;
        }
        ttsLog("play() resolved", { paused: audio.paused });
        return true;
      } catch (err) {
        const name = err instanceof Error ? err.name : "Error";
        const message = err instanceof Error ? err.message : String(err);
        ttsLog("play() rejected", { name, message });

        if (name === "AbortError" || generation !== playGenerationRef.current) {
          setStatus("idle");
          return false;
        }

        setStatus(silentFail ? "idle" : "error");
        if (!silentFail) {
          setError("Playback was blocked — tap again to hear Ema.");
        }
        return false;
      }
    },
    [ensureAudio]
  );

  const play = useCallback(
    async (text: string, options?: TtsPlayOptions): Promise<boolean> => {
      const trimmed = text.trim();
      const silentFail = Boolean(options?.silentFail);
      if (!trimmed) {
        ttsLog("play skipped — empty text");
        if (!silentFail) {
          setError("Nothing to speak.");
          setStatus("error");
        } else {
          setStatus("idle");
        }
        return false;
      }

      const generation = ++playGenerationRef.current;
      const selfStopper = stopperRef.current!;

      // Warm autoplay unlock via silent element only — never the TTS element.
      unlockTtsAudio();
      claimExclusiveTts(selfStopper);

      setError(null);

      if (cacheKeyRef.current === trimmed && urlRef.current) {
        ttsLog("cache hit", { textLen: trimmed.length });
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setStatus("loading");
        try {
          const ok = await playSrc(
            urlRef.current,
            silentFail,
            controller.signal,
            generation
          );
          return ok;
        } finally {
          if (abortRef.current === controller) abortRef.current = null;
        }
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Pause current audio but keep the element; revoke previous blob after replace.
      const audio = ensureAudio();
      audio.pause();

      setStatus("loading");
      ttsLog("request sent", {
        textLen: trimmed.length,
        voice: options?.voice ?? "default",
      });

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

        const contentType = response.headers.get("content-type") ?? "";
        ttsLog("response", {
          status: response.status,
          contentType,
          ok: response.ok,
        });

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error || "Failed to generate speech");
        }

        const blob = await response.blob();
        ttsLog("blob", { size: blob.size, type: blob.type || contentType });

        if (controller.signal.aborted || generation !== playGenerationRef.current) {
          ttsLog("aborted after blob");
          setStatus("idle");
          return false;
        }

        if (blob.size < 64) {
          throw new Error("TTS returned empty audio");
        }

        const previousUrl = urlRef.current;
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        cacheKeyRef.current = trimmed;
        ttsLog("blob URL created", { url: url.slice(0, 48), size: blob.size });

        // Assign new src before revoking the previous blob URL.
        audio.src = url;
        assignedSrcRef.current = url;

        if (previousUrl && previousUrl !== url) {
          URL.revokeObjectURL(previousUrl);
          ttsLog("revoked", {
            reason: "replaced",
            url: previousUrl.slice(0, 48),
          });
        }

        const ok = await playSrc(url, silentFail, controller.signal, generation);
        return ok;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          ttsLog("fetch aborted");
          setStatus("idle");
          return false;
        }
        if (generation !== playGenerationRef.current) {
          setStatus("idle");
          return false;
        }

        const message =
          err instanceof Error ? err.message : "Failed to play speech";
        ttsLog("play failed", { message });
        setStatus(silentFail ? "idle" : "error");
        if (!silentFail) {
          setError(message);
        }
        return false;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [ensureAudio, playSrc]
  );

  useEffect(() => {
    return () => {
      playGenerationRef.current += 1;
      abortRef.current?.abort();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
      audioRef.current = null;
      assignedSrcRef.current = null;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        ttsLog("revoked", { reason: "unmount" });
        urlRef.current = null;
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
