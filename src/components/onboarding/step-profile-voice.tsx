"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconMicrophone } from "@/components/dashboard/icons";
import { touchBtnPrimary, touchBtnSecondary, touchInput } from "@/components/quotes/ui";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import {
  transcribeAudio,
  transcribeText,
  useVoiceRecorder,
} from "@/hooks/use-voice-recorder";
import {
  EMPTY_PROFILE,
  MIC_DENIED_MESSAGE,
  PROFILE_FIELDS,
  buildSummarySpeech,
  formatProfileValue,
  type ProfileData,
  type ProfileFieldKey,
} from "@/types/onboarding";
import { formatTimer } from "@/types/quote";

interface StepProfileVoiceProps {
  onComplete: (profile: ProfileData) => void | Promise<void>;
}

type Phase = "collect" | "summary" | "revise";
type InputMode = "voice" | "typing_table";

async function extractFieldValue(
  field: ProfileFieldKey,
  transcript: string
): Promise<string> {
  const response = await fetch("/api/onboarding/extract-field", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, transcript }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to extract answer");
  }

  return data.value ?? "";
}

async function classifySummaryIntent(transcript: string) {
  const response = await fetch("/api/onboarding/summary-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to understand response");
  }

  return data as {
    intent: "confirm" | "change" | "enable_microphone";
    field: ProfileFieldKey | null;
  };
}

export function StepProfileVoice({ onComplete }: StepProfileVoiceProps) {
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [phase, setPhase] = useState<Phase>("collect");
  const [fieldIndex, setFieldIndex] = useState(0);
  const [revisingField, setRevisingField] = useState<ProfileFieldKey | null>(
    null
  );
  const [profile, setProfile] = useState<ProfileData>(EMPTY_PROFILE);
  const [typedValue, setTypedValue] = useState("");
  const [tableDraft, setTableDraft] = useState<ProfileData>(EMPTY_PROFILE);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [awaitingVoiceAnswer, setAwaitingVoiceAnswer] = useState(false);

  const flowStartedRef = useRef(false);
  const phaseRef = useRef<Phase>("collect");
  const fieldIndexRef = useRef(0);
  const revisingFieldRef = useRef<ProfileFieldKey | null>(null);
  const profileRef = useRef<ProfileData>(EMPTY_PROFILE);
  const inputModeRef = useRef<InputMode>("voice");

  const tts = useTtsPlayback();
  const ttsStopRef = useRef(tts.stop);
  ttsStopRef.current = tts.stop;
  const startRecordingRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    fieldIndexRef.current = fieldIndex;
  }, [fieldIndex]);

  useEffect(() => {
    revisingFieldRef.current = revisingField;
  }, [revisingField]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    inputModeRef.current = inputMode;
  }, [inputMode]);

  const activeField = useMemo(() => {
    if (phase === "revise" && revisingField) {
      return PROFILE_FIELDS.find((field) => field.key === revisingField) ?? null;
    }

    return PROFILE_FIELDS[fieldIndex] ?? null;
  }, [fieldIndex, phase, revisingField]);

  const currentQuestion = activeField?.question ?? buildSummarySpeech(profile);

  const askQuestion = useCallback(
    async (question: string) => {
      setFlowError(null);
      setAwaitingVoiceAnswer(false);
      try {
        await tts.speak(question);
        if (inputModeRef.current === "voice") {
          setAwaitingVoiceAnswer(true);
        }
      } catch (error) {
        setFlowError(
          error instanceof Error ? error.message : "Unable to play question"
        );
      }
    },
    [tts]
  );

  const handleFieldAnswer = useCallback(
    async (field: ProfileFieldKey, rawTranscript: string) => {
      const value = await extractFieldValue(field, rawTranscript);
      const nextProfile = { ...profileRef.current, [field]: value };
      profileRef.current = nextProfile;
      setProfile(nextProfile);
      setTypedValue("");

      if (phaseRef.current === "revise") {
        setPhase("summary");
        setRevisingField(null);
        revisingFieldRef.current = null;
        return "summary" as const;
      }

      const nextIndex = fieldIndexRef.current + 1;
      if (nextIndex >= PROFILE_FIELDS.length) {
        setPhase("summary");
        phaseRef.current = "summary";
        return "summary" as const;
      }

      setFieldIndex(nextIndex);
      fieldIndexRef.current = nextIndex;
      return "next" as const;
    },
    []
  );

  const runSummaryStepRef = useRef<() => Promise<void>>(async () => {});
  const startVoiceFlowRef = useRef<() => Promise<void>>(async () => {});

  const recorder = useVoiceRecorder({
    autoStopOnSilence: false,
    onRecordingComplete: async (blob) => {
      setFlowError(null);

      try {
        const transcript = await transcribeAudio(blob);

        if (transcript.toLowerCase().includes("enable microphone")) {
          setInputMode("voice");
          inputModeRef.current = "voice";
          return;
        }

        if (phaseRef.current === "summary") {
          const result = await classifySummaryIntent(transcript);

          if (result.intent === "enable_microphone") {
            setInputMode("voice");
            inputModeRef.current = "voice";
            await runSummaryStepRef.current();
            return;
          }

          if (result.intent === "confirm") {
            setIsSaving(true);
            try {
              await onComplete(profileRef.current);
            } finally {
              setIsSaving(false);
            }
            return;
          }

          if (result.intent === "change" && result.field) {
            setPhase("revise");
            phaseRef.current = "revise";
            setRevisingField(result.field);
            revisingFieldRef.current = result.field;
            const fieldDef = PROFILE_FIELDS.find(
              (field) => field.key === result.field
            );
            if (fieldDef) {
              await askQuestion(fieldDef.question);
            }
            return;
          }

          setFlowError(
            "I didn't catch that. Say confirm, or tell me what to change."
          );
          await runSummaryStepRef.current();
          return;
        }

        const field =
          revisingFieldRef.current ??
          PROFILE_FIELDS[fieldIndexRef.current]?.key;
        if (!field) return;

        const outcome = await handleFieldAnswer(field, transcript);

        if (outcome === "summary") {
          await runSummaryStepRef.current();
          return;
        }

        await startVoiceFlowRef.current();
      } catch (error) {
        setFlowError(
          error instanceof Error ? error.message : "Something went wrong"
        );
      }
    },
  });

  startRecordingRef.current = recorder.startRecording;

  const handleTapToAnswer = useCallback(async () => {
    setFlowError(null);
    recorder.setError(null);
    setAwaitingVoiceAnswer(false);

    try {
      await startRecordingRef.current?.();
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Microphone request was interrupted. Tap to answer to try again."
          : "Microphone access denied. You can type your answer instead.";
      setFlowError(message);
      setAwaitingVoiceAnswer(true);
    }
  }, [recorder]);

  const runSummaryStep = useCallback(async () => {
    setPhase("summary");
    phaseRef.current = "summary";
    const summaryText = buildSummarySpeech(profileRef.current);
    await askQuestion(summaryText);
  }, [askQuestion]);

  const startVoiceFlow = useCallback(async () => {
    const field = revisingFieldRef.current
      ? PROFILE_FIELDS.find((item) => item.key === revisingFieldRef.current)
      : PROFILE_FIELDS[fieldIndexRef.current];

    if (!field) {
      await runSummaryStep();
      return;
    }

    await askQuestion(field.question);
  }, [askQuestion, runSummaryStep]);

  useEffect(() => {
    runSummaryStepRef.current = runSummaryStep;
    startVoiceFlowRef.current = startVoiceFlow;
  }, [runSummaryStep, startVoiceFlow]);

  useEffect(() => {
    return () => {
      ttsStopRef.current();
    };
  }, []);

  useEffect(() => {
    if (inputMode !== "voice") return;
    if (flowStartedRef.current) return;

    flowStartedRef.current = true;
    startVoiceFlow();
  }, [inputMode, startVoiceFlow]);

  async function submitTypedAnswer() {
    if (!activeField || !typedValue.trim()) return;

    setFlowError(null);
    recorder.setStatus("processing");

    try {
      const transcript = await transcribeText(typedValue.trim());
      const outcome = await handleFieldAnswer(activeField.key, transcript);

      if (outcome === "summary") {
        if (inputMode === "voice") {
          await runSummaryStep();
        } else {
          setPhase("summary");
          phaseRef.current = "summary";
        }
        return;
      }

      if (inputMode === "voice") {
        await startVoiceFlow();
      }
    } catch (error) {
      setFlowError(
        error instanceof Error ? error.message : "Failed to save answer"
      );
    } finally {
      recorder.setStatus("idle");
    }
  }

  async function submitTableReview() {
    setFlowError(null);

    const missingRequired = PROFILE_FIELDS.filter(
      (field) => !field.optional && !tableDraft[field.key]?.trim()
    );

    if (missingRequired.length > 0) {
      setFlowError("Please fill in all required fields before continuing.");
      return;
    }

    profileRef.current = tableDraft;
    setProfile(tableDraft);

    if (inputMode === "voice") {
      await runSummaryStep();
    } else {
      setPhase("summary");
      phaseRef.current = "summary";
    }
  }

  function switchToTypingMode() {
    setInputMode("typing_table");
    inputModeRef.current = "typing_table";
    setAwaitingVoiceAnswer(false);
    tts.stop();
  }

  function switchToVoiceMode() {
    setInputMode("voice");
    inputModeRef.current = "voice";
    flowStartedRef.current = false;
  }

  async function enableMicrophone() {
    setFlowError(null);
    switchToVoiceMode();

    if (phase === "summary") {
      flowStartedRef.current = true;
      await runSummaryStep();
    } else if (phase === "collect" || phase === "revise") {
      flowStartedRef.current = true;
      await startVoiceFlow();
    }
  }

  async function confirmProfile() {
    setIsSaving(true);
    setFlowError(null);

    try {
      await onComplete(profile);
    } catch (error) {
      setFlowError(
        error instanceof Error ? error.message : "Failed to save profile"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function requestFieldChange(field: ProfileFieldKey) {
    setPhase("revise");
    phaseRef.current = "revise";
    setRevisingField(field);
    revisingFieldRef.current = field;
    setTypedValue(profile[field]);

    if (inputMode === "voice") {
      const fieldDef = PROFILE_FIELDS.find((item) => item.key === field);
      if (fieldDef) {
        await askQuestion(fieldDef.question);
      }
    }
  }

  const isBusy =
    tts.isLoading ||
    tts.isSpeaking ||
    recorder.status === "processing" ||
    isSaving;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-8">
      <EmaAvatar
        isActive={tts.isSpeaking || recorder.status === "recording"}
      />

      {inputMode === "typing_table" && phase === "collect" ? (
        <TypingTableMode
          draft={tableDraft}
          onChange={(key, value) =>
            setTableDraft((current) => ({ ...current, [key]: value }))
          }
          onReview={submitTableReview}
          onEnableMic={enableMicrophone}
        />
      ) : phase === "summary" ? (
        <SummaryView
          profile={profile}
          visibleChars={tts.visibleChars}
          questionText={buildSummarySpeech(profile)}
          isSpeaking={tts.isSpeaking}
          awaitingVoiceAnswer={awaitingVoiceAnswer}
          recorderStatus={recorder.status}
          seconds={recorder.seconds}
          showVoiceControls={inputMode === "voice"}
          onTapToAnswer={handleTapToAnswer}
          onDoneRecording={recorder.stopRecording}
          onConfirm={confirmProfile}
          onChangeField={requestFieldChange}
          isSaving={isSaving}
        />
      ) : (
        <QuestionView
          question={currentQuestion}
          visibleChars={tts.visibleChars}
          isSpeaking={tts.isSpeaking}
          awaitingVoiceAnswer={awaitingVoiceAnswer}
          typedValue={typedValue}
          onTypedValueChange={setTypedValue}
          onSubmitTyped={submitTypedAnswer}
          recorderStatus={recorder.status}
          seconds={recorder.seconds}
          onTapToAnswer={handleTapToAnswer}
          onDoneRecording={recorder.stopRecording}
          onSwitchToTyping={switchToTypingMode}
          showVoiceControls={inputMode === "voice"}
        />
      )}

      {inputMode === "typing_table" && phase === "collect" && (
        <p className="mt-6 max-w-2xl text-center text-base leading-relaxed text-slate-400">
          {MIC_DENIED_MESSAGE}
        </p>
      )}

      {(flowError || tts.error || recorder.error) && (
        <div className="mt-6 w-full max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-400">
          {flowError || tts.error || recorder.error}
        </div>
      )}

      {isBusy && phase !== "summary" && inputMode === "voice" && (
        <p className="mt-4 text-sm text-slate-400">
          {tts.isLoading
            ? "Preparing Ema's voice..."
            : tts.isSpeaking
              ? "Ema is speaking..."
              : recorder.status === "processing"
                ? "Processing your answer..."
                : null}
        </p>
      )}
    </div>
  );
}

function EmaAvatar({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={`relative mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-blue-700 shadow-lg shadow-accent/20 ${
        isActive ? "animate-pulse" : ""
      }`}
    >
      <span className="text-2xl font-bold text-white">Ema</span>
      {isActive && (
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
  );
}

function QuestionView({
  question,
  visibleChars,
  isSpeaking,
  awaitingVoiceAnswer,
  typedValue,
  onTypedValueChange,
  onSubmitTyped,
  recorderStatus,
  seconds,
  onTapToAnswer,
  onDoneRecording,
  onSwitchToTyping,
  showVoiceControls,
}: {
  question: string;
  visibleChars: number;
  isSpeaking: boolean;
  awaitingVoiceAnswer: boolean;
  typedValue: string;
  onTypedValueChange: (value: string) => void;
  onSubmitTyped: () => void;
  recorderStatus: "idle" | "recording" | "processing";
  seconds: number;
  onTapToAnswer: () => void;
  onDoneRecording: () => void;
  onSwitchToTyping: () => void;
  showVoiceControls: boolean;
}) {
  const visibleQuestion = question.slice(0, visibleChars);

  return (
    <div className="w-full max-w-2xl text-center">
      <p className="min-h-[5rem] text-lg leading-relaxed text-slate-200 sm:text-xl">
        {visibleQuestion || question}
        {isSpeaking && visibleChars < question.length && (
          <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-accent align-middle" />
        )}
      </p>

      {showVoiceControls && (
        <div className="mt-8 flex flex-col items-center">
          {recorderStatus === "recording" ? (
            <>
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/20 ring-4 ring-accent/30">
                <IconMicrophone className="h-10 w-10 animate-pulse text-accent" />
              </div>
              <p className="mt-4 text-base font-medium text-white">Listening...</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">
                {formatTimer(seconds)}
              </p>
              <button
                type="button"
                onClick={onDoneRecording}
                className={`${touchBtnPrimary} mt-4 min-w-[160px]`}
              >
                Done
              </button>
            </>
          ) : recorderStatus === "processing" ? (
            <div className="flex h-24 w-24 items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
            </div>
          ) : isSpeaking ? (
            <p className="text-base text-slate-400">Listen to Ema...</p>
          ) : awaitingVoiceAnswer ? (
            <button
              type="button"
              onClick={onTapToAnswer}
              className={`${touchBtnPrimary} inline-flex items-center gap-2`}
            >
              <IconMicrophone className="h-5 w-5" />
              Tap to answer
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={typedValue}
          onChange={(event) => onTypedValueChange(event.target.value)}
          placeholder="Or type your answer here"
          className={`${touchInput} flex-1`}
        />
        <button
          type="button"
          onClick={onSubmitTyped}
          disabled={!typedValue.trim() || recorderStatus === "processing"}
          className={`${touchBtnSecondary} w-full sm:w-auto`}
        >
          Use typed answer
        </button>
      </div>

      {showVoiceControls && (
        <button
          type="button"
          onClick={onSwitchToTyping}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-base font-medium text-accent hover:text-blue-400"
        >
          Use typing mode
        </button>
      )}
    </div>
  );
}

function TypingTableMode({
  draft,
  onChange,
  onReview,
  onEnableMic,
}: {
  draft: ProfileData;
  onChange: (key: ProfileFieldKey, value: string) => void;
  onReview: () => void;
  onEnableMic: () => void;
}) {
  return (
    <div className="w-full">
      <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">
        Set up your profile
      </h2>
      <p className="mt-2 text-center text-base text-slate-400">
        Type your answers below, then review when ready.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 font-medium text-slate-300">Question</th>
              <th className="px-4 py-3 font-medium text-slate-300">Your answer</th>
            </tr>
          </thead>
          <tbody>
            {PROFILE_FIELDS.map((field) => (
              <tr key={field.key} className="border-b border-white/5">
                <td className="px-4 py-3 align-top text-slate-400">
                  {field.label}
                  {!field.optional && <span className="text-accent"> *</span>}
                </td>
                <td className="px-4 py-3">
                  <input
                    type={field.key === "email" ? "email" : "text"}
                    value={draft[field.key]}
                    onChange={(event) => onChange(field.key, event.target.value)}
                    className={touchInput}
                    placeholder={field.optional ? "Optional" : "Required"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onEnableMic}
          className={`${touchBtnSecondary} inline-flex items-center justify-center gap-2`}
        >
          <IconMicrophone className="h-5 w-5" />
          Switch to voice
        </button>
        <button type="button" onClick={onReview} className={touchBtnPrimary}>
          Review profile
        </button>
      </div>
    </div>
  );
}

function SummaryView({
  profile,
  visibleChars,
  questionText,
  isSpeaking,
  awaitingVoiceAnswer,
  recorderStatus,
  seconds,
  showVoiceControls,
  onTapToAnswer,
  onDoneRecording,
  onConfirm,
  onChangeField,
  isSaving,
}: {
  profile: ProfileData;
  visibleChars: number;
  questionText: string;
  isSpeaking: boolean;
  awaitingVoiceAnswer: boolean;
  recorderStatus: "idle" | "recording" | "processing";
  seconds: number;
  showVoiceControls: boolean;
  onTapToAnswer: () => void;
  onDoneRecording: () => void;
  onConfirm: () => void;
  onChangeField: (field: ProfileFieldKey) => void;
  isSaving: boolean;
}) {
  const visiblePrompt = questionText.slice(0, visibleChars);

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-center text-xl font-semibold text-white sm:text-2xl">
        Profile Summary
      </h2>

      <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        {PROFILE_FIELDS.map((field) => (
          <div
            key={field.key}
            className="flex flex-col gap-1 border-b border-white/5 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm font-medium uppercase tracking-wide text-slate-500">
              {field.label}
            </span>
            <span className="text-base text-white">
              {formatProfileValue(field.key, profile[field.key])}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-lg leading-relaxed text-slate-200">
        {visiblePrompt || questionText}
        {isSpeaking && visibleChars < questionText.length && (
          <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-accent align-middle" />
        )}
      </p>

      {showVoiceControls && (
        <div className="mt-6 flex flex-col items-center">
          {recorderStatus === "recording" ? (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20 ring-4 ring-accent/30">
                <IconMicrophone className="h-8 w-8 animate-pulse text-accent" />
              </div>
              <p className="mt-3 text-base font-medium text-white">Listening...</p>
              <p className="mt-1 font-mono text-xl font-bold text-white">
                {formatTimer(seconds)}
              </p>
              <button
                type="button"
                onClick={onDoneRecording}
                className={`${touchBtnPrimary} mt-4 min-w-[160px]`}
              >
                Done
              </button>
            </>
          ) : recorderStatus === "processing" ? (
            <div className="flex h-20 w-20 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-accent" />
            </div>
          ) : isSpeaking ? (
            <p className="text-base text-slate-400">Listen to Ema...</p>
          ) : awaitingVoiceAnswer ? (
            <button
              type="button"
              onClick={onTapToAnswer}
              className={`${touchBtnPrimary} inline-flex items-center gap-2`}
            >
              <IconMicrophone className="h-5 w-5" />
              Tap to answer
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {PROFILE_FIELDS.map((field) => (
          <button
            key={field.key}
            type="button"
            onClick={() => onChangeField(field.key)}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Change {field.label.toLowerCase()}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={isSaving}
        className={`${touchBtnPrimary} mt-8 w-full`}
      >
        {isSaving ? "Saving..." : "Confirm"}
      </button>
    </div>
  );
}
