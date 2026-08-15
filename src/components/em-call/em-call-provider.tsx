"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { EmCallPhase } from "@/lib/em-call/greeting";

type EmCallContextValue = {
  greetingName: string;
  isOpen: boolean;
  phase: EmCallPhase;
  transcript: string | null;
  statusMessage: string | null;
  error: string | null;
  startCall: () => void;
  endCall: () => void;
  setPhase: (phase: EmCallPhase) => void;
  setTranscript: (value: string | null) => void;
  setStatusMessage: (value: string | null) => void;
  setError: (value: string | null) => void;
};

const EmCallContext = createContext<EmCallContextValue | null>(null);

export function EmCallProvider({
  greetingName,
  children,
}: {
  greetingName: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<EmCallPhase>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(() => {
    setTranscript(null);
    setError(null);
    setStatusMessage(null);
    setPhase("greeting");
    setIsOpen(true);
  }, []);

  const endCall = useCallback(() => {
    setIsOpen(false);
    setPhase("idle");
    setTranscript(null);
    setStatusMessage(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      greetingName,
      isOpen,
      phase,
      transcript,
      statusMessage,
      error,
      startCall,
      endCall,
      setPhase,
      setTranscript,
      setStatusMessage,
      setError,
    }),
    [
      greetingName,
      isOpen,
      phase,
      transcript,
      statusMessage,
      error,
      startCall,
      endCall,
    ]
  );

  return (
    <EmCallContext.Provider value={value}>{children}</EmCallContext.Provider>
  );
}

export function useEmCall(): EmCallContextValue {
  const ctx = useContext(EmCallContext);
  if (!ctx) {
    throw new Error("useEmCall must be used within EmCallProvider");
  }
  return ctx;
}
