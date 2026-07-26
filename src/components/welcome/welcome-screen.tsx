"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const WELCOME_TEXT =
  "Hi! I'm Ema, your smart AI assistant. Welcome to EmaX. Let's set up your profile together. Just talk to me — there's no need to type anything. I'll ask the questions, you answer naturally, and I'll take care of the rest. Oh... one important question before we begin... Did you have your coffee today?";

const PARAGRAPHS = [
  "Hi! I'm Ema, your smart AI assistant.",
  "Welcome to EmaX.",
  "Let's set up your profile together.",
  "Just talk to me — there's no need to type anything.",
  "I'll ask the questions, you answer naturally, and I'll take care of the rest.",
  "Oh... one important question before we begin...",
  "Did you have your coffee today?",
];

function getVisibleParagraphs(visibleCount: number): string[] {
  let index = 0;

  return PARAGRAPHS.map((paragraph, paragraphIndex) => {
    const visibleInParagraph = Math.max(
      0,
      Math.min(paragraph.length, visibleCount - index)
    );
    index += paragraph.length;

    if (paragraphIndex < PARAGRAPHS.length - 1) {
      index += 1;
    }

    return paragraph.slice(0, visibleInParagraph);
  });
}

export function WelcomeScreen() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  const [visibleChars, setVisibleChars] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsTap, setNeedsTap] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showContinue, setShowContinue] = useState(false);

  const stopAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const syncTypewriter = useCallback(() => {
    const audio = audioRef.current;
    const duration = durationRef.current;
    if (!audio || !duration) return;

    const progress = Math.min(audio.currentTime / duration, 1);
    const nextCount = Math.floor(progress * WELCOME_TEXT.length);
    setVisibleChars(Math.min(nextCount, WELCOME_TEXT.length));

    if (audio.ended) {
      setVisibleChars(WELCOME_TEXT.length);
      setIsSpeaking(false);
      setShowContinue(true);
      stopAnimation();
      return;
    }

    if (!audio.paused) {
      rafRef.current = requestAnimationFrame(syncTypewriter);
    }
  }, [stopAnimation]);

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    setNeedsTap(false);
    setIsSpeaking(true);
    setShowContinue(false);

    try {
      await audio.play();
      stopAnimation();
      rafRef.current = requestAnimationFrame(syncTypewriter);
    } catch {
      setNeedsTap(true);
      setIsSpeaking(false);
    }
  }, [stopAnimation, syncTypewriter]);

  const goToOnboarding = useCallback(() => {
    stopAnimation();
    audioRef.current?.pause();
    router.push("/onboarding");
  }, [router, stopAnimation]);

  useEffect(() => {
    let cancelled = false;

    async function loadSpeech() {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: WELCOME_TEXT }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load welcome audio");
        }

        const blob = await response.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.addEventListener("loadedmetadata", () => {
          durationRef.current = audio.duration;
        });

        audio.addEventListener("ended", () => {
          setVisibleChars(WELCOME_TEXT.length);
          setIsSpeaking(false);
          setShowContinue(true);
          stopAnimation();
        });

        if (audio.readyState >= 1) {
          durationRef.current = audio.duration;
        }

        setIsLoading(false);

        try {
          await audio.play();
          setIsSpeaking(true);
          rafRef.current = requestAnimationFrame(syncTypewriter);
        } catch {
          setNeedsTap(true);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load welcome audio"
          );
          setIsLoading(false);
        }
      }
    }

    loadSpeech();

    return () => {
      cancelled = true;
      stopAnimation();
      audioRef.current?.pause();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [stopAnimation, syncTypewriter]);

  const visibleParagraphs = getVisibleParagraphs(visibleChars);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-navy px-6 py-12 text-white">
      <button
        type="button"
        onClick={goToOnboarding}
        className="absolute right-6 top-6 text-sm text-slate-400 transition hover:text-white"
      >
        Skip
      </button>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.12)_0%,_transparent_60%)]" />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        <div
          className={`relative mb-10 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-blue-700 shadow-lg shadow-accent/20 ${
            isSpeaking ? "animate-pulse" : ""
          }`}
        >
          <span className="text-2xl font-bold text-white">Ema</span>
          {isSpeaking && (
            <div className="absolute -bottom-3 flex items-end gap-1">
              {[0, 1, 2, 3, 4].map((bar) => (
                <span
                  key={bar}
                  className="block h-4 w-1 origin-bottom animate-waveform rounded-full bg-accent"
                  style={{ animationDelay: `${bar * 0.12}s` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="w-full space-y-3 text-center text-lg leading-relaxed text-slate-200 sm:text-xl">
          {visibleParagraphs.map((paragraph, index) => (
            <p
              key={index}
              className={`min-h-[1.75rem] ${
                index >= PARAGRAPHS.length - 2 ? "mt-6" : ""
              }`}
            >
              {paragraph}
              {index === visibleParagraphs.length - 1 &&
                visibleChars < WELCOME_TEXT.length &&
                isSpeaking && (
                  <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-accent align-middle" />
                )}
            </p>
          ))}
        </div>

        {isLoading && (
          <p className="mt-8 text-sm text-slate-400">Preparing your welcome...</p>
        )}

        {loadError && (
          <p className="mt-8 text-sm text-red-400">{loadError}</p>
        )}

        {needsTap && !loadError && (
          <button
            type="button"
            onClick={startPlayback}
            className="mt-8 rounded-xl bg-accent px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-600"
          >
            Tap to start
          </button>
        )}

        {showContinue && (
          <button
            type="button"
            onClick={goToOnboarding}
            className="mt-10 animate-fade-in rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white transition hover:bg-blue-600"
          >
            Let&apos;s go
          </button>
        )}
      </div>
    </div>
  );
}
