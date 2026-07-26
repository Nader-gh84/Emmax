"use client";

import { useCallback, useRef, useState } from "react";

interface UseTtsPlaybackResult {
  visibleChars: number;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  speak: (text: string) => Promise<void>;
  stop: () => void;
}

export function useTtsPlayback(): UseTtsPlaybackResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const textRef = useRef("");
  const speakGenerationRef = useRef(0);

  const [visibleChars, setVisibleChars] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cleanupAudio = useCallback(() => {
    stopAnimation();
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, [stopAnimation]);

  const syncTypewriter = useCallback(() => {
    const audio = audioRef.current;
    const duration = durationRef.current;
    const text = textRef.current;

    if (!audio || !duration || !text) return;

    const progress = Math.min(audio.currentTime / duration, 1);
    const nextCount = Math.floor(progress * text.length);
    setVisibleChars(Math.min(nextCount, text.length));

    if (audio.ended) {
      setVisibleChars(text.length);
      setIsSpeaking(false);
      stopAnimation();
      return;
    }

    if (!audio.paused) {
      rafRef.current = requestAnimationFrame(syncTypewriter);
    }
  }, [stopAnimation]);

  const stop = useCallback(() => {
    speakGenerationRef.current += 1;
    cleanupAudio();
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanupAudio]);

  const speak = useCallback(
    async (text: string) => {
      speakGenerationRef.current += 1;
      const generation = speakGenerationRef.current;

      cleanupAudio();
      setError(null);
      setIsLoading(true);
      setVisibleChars(0);
      textRef.current = text;

      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (generation !== speakGenerationRef.current) return;

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load speech");
        }

        const blob = await response.blob();
        if (generation !== speakGenerationRef.current) return;

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.addEventListener(
            "loadedmetadata",
            () => {
              durationRef.current = audio.duration;
              resolve();
            },
            { once: true }
          );
          audio.addEventListener(
            "error",
            () => reject(new Error("Failed to play audio")),
            { once: true }
          );
        });

        if (generation !== speakGenerationRef.current) return;

        setIsLoading(false);
        setIsSpeaking(true);

        await new Promise<void>((resolve, reject) => {
          audio.addEventListener("ended", () => resolve(), { once: true });
          audio.addEventListener(
            "error",
            () => reject(new Error("Failed to play audio")),
            { once: true }
          );

          audio
            .play()
            .then(() => {
              if (generation !== speakGenerationRef.current) {
                resolve();
                return;
              }
              rafRef.current = requestAnimationFrame(syncTypewriter);
            })
            .catch(reject);
        });

        if (generation !== speakGenerationRef.current) return;

        setVisibleChars(text.length);
        setIsSpeaking(false);
        stopAnimation();
      } catch (err) {
        if (generation !== speakGenerationRef.current) return;

        const message = err instanceof Error ? err.message : "Speech failed";
        if (message.toLowerCase().includes("aborted")) return;

        setError(message);
        setIsSpeaking(false);
        setIsLoading(false);
        stopAnimation();
        throw err;
      } finally {
        if (generation === speakGenerationRef.current) {
          setIsLoading(false);
        }
      }
    },
    [cleanupAudio, stopAnimation, syncTypewriter]
  );

  return {
    visibleChars,
    isSpeaking,
    isLoading,
    error,
    speak,
    stop,
  };
}
