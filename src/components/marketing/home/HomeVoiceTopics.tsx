"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LandingVoiceTopic } from "@/lib/ema-landing-facts";
import styles from "./home.module.css";

type VoiceState = "idle" | "thinking" | "speaking";

const TOPICS: Array<{
  topic: LandingVoiceTopic;
  num: string;
  name: string;
  desc: string;
}> = [
  {
    topic: "projects",
    num: "01",
    name: "Projects",
    desc: "All in one place",
  },
  {
    topic: "suppliers",
    num: "02",
    name: "Suppliers",
    desc: "Best prices, faster",
  },
  {
    topic: "customers",
    num: "03",
    name: "Customers",
    desc: "Happy and informed",
  },
];

/**
 * Port of public/Home.html voice script:
 * idle → thinking → speaking → idle, one active voice, abort on swap/stop.
 */
export default function HomeVoiceTopics() {
  const [activeTopic, setActiveTopic] = useState<LandingVoiceTopic | null>(
    null
  );
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeTopicRef = useRef<LandingVoiceTopic | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onEnded = () => {
      stopAll();
    };
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stopAll stable via refs
  }, []);

  const stopAll = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    activeTopicRef.current = null;
    setActiveTopic(null);
    setVoiceState("idle");
  }, []);

  const speak = useCallback(
    async (topic: LandingVoiceTopic) => {
      activeTopicRef.current = topic;
      setActiveTopic(topic);
      setVoiceState("thinking");

      const abortCtrl = new AbortController();
      abortRef.current = abortCtrl;

      try {
        const scriptRes = await fetch("/api/landing-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
          signal: abortCtrl.signal,
        });
        const { text } = (await scriptRes.json()) as { text?: string };
        if (!text) throw new Error("Empty voice script");

        const ttsRes = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "nova" }),
          signal: abortCtrl.signal,
        });
        const blob = await ttsRes.blob();

        if (activeTopicRef.current !== topic) return;

        const audio = audioRef.current;
        if (!audio) return;

        audio.src = URL.createObjectURL(blob);
        await audio.play();
        setVoiceState("speaking");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Voice failed:", err);
        if (activeTopicRef.current === topic) stopAll();
      }
    },
    [stopAll]
  );

  const onTopicClick = (topic: LandingVoiceTopic) => {
    if (activeTopicRef.current === topic) {
      stopAll();
      return;
    }
    stopAll();
    void speak(topic);
  };

  return (
    <div className={styles.topics}>
      {TOPICS.map((item) => {
        const isActive = activeTopic === item.topic;
        const isThinking = isActive && voiceState === "thinking";
        const isSpeaking = isActive && voiceState === "speaking";

        return (
          <button
            key={item.topic}
            type="button"
            className={[
              styles.topic,
              isThinking ? styles.isThinking : "",
              isSpeaking ? styles.isSpeaking : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-topic={item.topic}
            onClick={() => onTopicClick(item.topic)}
          >
            <span className={styles.num}>{item.num}</span>
            <span className={styles.name}>
              {item.name}
              <span className={styles.wave} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className={styles.desc}>{item.desc}</span>
          </button>
        );
      })}
    </div>
  );
}
