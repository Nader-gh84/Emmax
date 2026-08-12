"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { LandingVoiceTopic } from "@/lib/ema-landing-facts";

type VoiceState = "idle" | "thinking" | "speaking";

type HitLink = {
  href: string;
  label: string;
  /** percent of the 1536×1024 mockup frame */
  style: CSSProperties;
  className?: string;
};

const NAV_HITS: HitLink[] = [
  {
    href: "/",
    label: "EmaX home",
    style: { left: "2.8%", top: "3.2%", width: "9.5%", height: "5.2%" },
  },
  {
    href: "/",
    label: "Home",
    style: { left: "36.5%", top: "3.8%", width: "5.2%", height: "4%" },
  },
  {
    href: "/about",
    label: "About",
    style: { left: "42.5%", top: "3.8%", width: "5.5%", height: "4%" },
  },
  {
    href: "/features",
    label: "Features",
    style: { left: "49%", top: "3.8%", width: "7%", height: "4%" },
  },
  {
    href: "/pricing",
    label: "Pricing",
    style: { left: "57%", top: "3.8%", width: "6.2%", height: "4%" },
  },
  {
    href: "/faq",
    label: "FAQ",
    style: { left: "64%", top: "3.8%", width: "4.2%", height: "4%" },
  },
  {
    href: "/login",
    label: "Sign in",
    style: { left: "85.5%", top: "3%", width: "11.5%", height: "5.5%" },
  },
  {
    href: "/login",
    label: "Click to enter",
    style: { left: "45.5%", top: "52%", width: "9%", height: "16%" },
    className: "landing-cta-hit",
  },
  {
    href: "/login",
    label: "Continue to login",
    style: { left: "88%", top: "89%", width: "9%", height: "6%" },
  },
];

const VOICE_HITS: Array<{
  topic: LandingVoiceTopic;
  label: string;
  style: CSSProperties;
}> = [
  {
    topic: "projects",
    label: "01 Projects",
    style: { left: "26%", top: "87%", width: "14%", height: "9%" },
  },
  {
    topic: "suppliers",
    label: "02 Suppliers",
    style: { left: "42%", top: "87%", width: "15%", height: "9%" },
  },
  {
    topic: "customers",
    label: "03 Customers",
    style: { left: "58.5%", top: "87%", width: "15.5%", height: "9%" },
  },
];

function VoiceWave({ active }: { active: boolean }) {
  return (
    <span
      className={`landing-voice-wave ${active ? "is-active" : ""}`}
      aria-hidden
    >
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export default function LandingInteractive() {
  const [activeTopic, setActiveTopic] = useState<LandingVoiceTopic | null>(
    null
  );
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const stopAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const resetIdle = useCallback(() => {
    stopAudio();
    setActiveTopic(null);
    setVoiceState("idle");
  }, [stopAudio]);

  useEffect(() => () => resetIdle(), [resetIdle]);

  const playTopic = useCallback(
    async (topic: LandingVoiceTopic) => {
      const generation = ++generationRef.current;
      stopAudio();
      setActiveTopic(topic);
      setVoiceState("thinking");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const scriptRes = await fetch("/api/landing-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
          signal: controller.signal,
        });

        if (!scriptRes.ok) {
          throw new Error("Failed to generate voice script");
        }

        const script = (await scriptRes.json()) as { text?: string };
        if (!script.text?.trim()) {
          throw new Error("Empty voice script");
        }

        if (generation !== generationRef.current) return;

        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: script.text,
            voice: "nova",
          }),
          signal: controller.signal,
        });

        if (!ttsRes.ok) {
          throw new Error("Failed to synthesize speech");
        }

        const blob = await ttsRes.blob();
        if (generation !== generationRef.current) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          if (generation !== generationRef.current) return;
          resetIdle();
        };
        audio.onerror = () => {
          if (generation !== generationRef.current) return;
          resetIdle();
        };

        setVoiceState("speaking");
        await audio.play();
      } catch (error) {
        if (controller.signal.aborted || generation !== generationRef.current) {
          return;
        }
        console.error("Landing voice playback failed:", error);
        resetIdle();
      }
    },
    [resetIdle, stopAudio]
  );

  const onVoiceClick = (topic: LandingVoiceTopic) => {
    if (activeTopic === topic && voiceState !== "idle") {
      generationRef.current += 1;
      resetIdle();
      return;
    }
    void playTopic(topic);
  };

  return (
    <div className="absolute inset-0 z-10">
      {NAV_HITS.map((hit) => (
        <Link
          key={`${hit.href}-${hit.label}`}
          href={hit.href}
          aria-label={hit.label}
          className={`absolute rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${hit.className ?? ""}`}
          style={hit.style}
        />
      ))}

      {VOICE_HITS.map((hit) => {
        const isActive = activeTopic === hit.topic;
        const isThinking = isActive && voiceState === "thinking";
        const isSpeaking = isActive && voiceState === "speaking";

        return (
          <button
            key={hit.topic}
            type="button"
            aria-label={`${hit.label}${isSpeaking ? " (playing — click to stop)" : isThinking ? " (preparing)" : " — hear Ema explain"}`}
            aria-pressed={isActive && voiceState !== "idle"}
            className={`landing-voice-hit absolute ${isThinking ? "is-thinking" : ""} ${isSpeaking ? "is-speaking" : ""}`}
            style={hit.style}
            onClick={() => onVoiceClick(hit.topic)}
          >
            <span className="landing-voice-indicator">
              <VoiceWave active={isSpeaking || isThinking} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
