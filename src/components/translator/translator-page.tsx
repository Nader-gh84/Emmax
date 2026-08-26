"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconTranslate } from "@/components/dashboard/icons";
import { touchBtnPrimary, touchBtnSecondary, touchInput } from "@/components/quotes/ui";
import {
  STATUS_LABELS,
  type ExportMode,
  type TranscriptionJob,
  type TranscriptionJobWithSegments,
} from "@/types/translator";
import { platformLabel } from "@/lib/translator/platform";

type ResultTab = "original" | "english" | "persian" | "compare";

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "";
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function TranslatorPage() {
  const [url, setUrl] = useState("");
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [needsUploadHint, setNeedsUploadHint] = useState(false);
  const [history, setHistory] = useState<TranscriptionJob[]>([]);
  const [activeJob, setActiveJob] = useState<TranscriptionJobWithSegments | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ResultTab>("persian");
  const [exportMode, setExportMode] = useState<ExportMode>("english_persian");
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/translator/jobs");
      const data = await response.json();
      if (response.ok) {
        setHistory(data.jobs || []);
      }
    } catch {
      // ignore history load errors on mount
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      setDetectedPlatform(null);
      setNeedsUploadHint(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/translator/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceUrl: trimmed }),
        });
        const data = await response.json();
        if (response.ok) {
          setDetectedPlatform(data.label || null);
          setNeedsUploadHint(Boolean(data.needsUpload));
          if (data.needsUpload) setShowUpload(true);
        }
      } catch {
        setDetectedPlatform(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [url]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshJob = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/translator/jobs/${jobId}`);
    const data = await response.json();
    if (response.ok && data.job) {
      setActiveJob(data.job);
      return data.job as TranscriptionJobWithSegments;
    }
    return null;
  }, []);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        const job = await refreshJob(jobId);
        if (!job) return;
        if (job.status === "completed" || job.status === "failed") {
          stopPolling();
          setIsProcessing(false);
          loadHistory();
        }
      }, 2000);
    },
    [loadHistory, refreshJob, stopPolling]
  );

  const runProcess = useCallback(
    async (jobId: string) => {
      setIsProcessing(true);
      setError(null);
      startPolling(jobId);

      try {
        const response = await fetch(`/api/translator/jobs/${jobId}/process`, {
          method: "POST",
        });
        const data = await response.json();
        if (data.job) {
          setActiveJob(data.job);
        }
        if (!response.ok) {
          setError(data.error || "Processing failed");
          await refreshJob(jobId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Processing failed");
        await refreshJob(jobId);
      } finally {
        stopPolling();
        setIsProcessing(false);
        loadHistory();
      }
    },
    [loadHistory, refreshJob, startPolling, stopPolling]
  );

  async function handleGenerate() {
    setError(null);
    setIsCreating(true);
    setActiveJob(null);
    setTab("persian");

    try {
      const response = await fetch("/api/translator/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not start transcript");
      }

      const job = data.job as TranscriptionJob;
      setActiveJob({ ...job, segments: [] });
      await loadHistory();

      if (job.needs_upload) {
        setShowUpload(true);
        setError(
          job.error_message ||
            "We couldn’t access the media directly from this link. Upload the video/audio file instead."
        );
        return;
      }

      await runProcess(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpload(file: File) {
    setError(null);
    setIsCreating(true);

    try {
      const form = new FormData();
      form.append("file", file);
      if (url.trim()) form.append("sourceUrl", url.trim());
      if (activeJob?.id && activeJob.needs_upload) {
        form.append("jobId", activeJob.id);
      }

      const response = await fetch("/api/translator/jobs", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const job = data.job as TranscriptionJob;
      setActiveJob({ ...job, segments: [] });
      setShowUpload(false);
      await loadHistory();
      await runProcess(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsCreating(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRetry() {
    if (!activeJob) return;
    setError(null);
    setIsProcessing(true);
    startPolling(activeJob.id);

    try {
      const response = await fetch(`/api/translator/jobs/${activeJob.id}/retry`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.job) setActiveJob(data.job);
      if (!response.ok) {
        setError(data.error || "Retry failed");
        await refreshJob(activeJob.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      stopPolling();
      setIsProcessing(false);
      loadHistory();
    }
  }

  async function openHistoryItem(jobId: string) {
    setError(null);
    const job = await refreshJob(jobId);
    if (!job) {
      setError("Could not open this transcript.");
      return;
    }
    setActiveJob(job);
    setTab("persian");
    if (job.needs_upload && job.status === "failed") {
      setShowUpload(true);
    }
    if (
      job.status !== "completed" &&
      job.status !== "failed" &&
      job.status !== "queued"
    ) {
      startPolling(job.id);
    }
  }

  const joinedOriginal = useMemo(
    () =>
      (activeJob?.segments || [])
        .map((s) => {
          const ts = formatTimestamp(s.start_time);
          return ts ? `${ts}\n${s.original_text}` : s.original_text;
        })
        .join("\n\n"),
    [activeJob]
  );

  const joinedEnglish = useMemo(
    () =>
      (activeJob?.segments || [])
        .map((s) => {
          const ts = formatTimestamp(s.start_time);
          return ts ? `${ts}\n${s.english_text}` : s.english_text;
        })
        .join("\n\n"),
    [activeJob]
  );

  const joinedPersian = useMemo(
    () =>
      (activeJob?.segments || [])
        .map((s) => {
          const ts = formatTimestamp(s.start_time);
          return ts ? `${ts}\n${s.persian_text}` : s.persian_text;
        })
        .join("\n\n"),
    [activeJob]
  );

  async function handleCopy(kind: "original" | "english" | "persian") {
    const text =
      kind === "original"
        ? joinedOriginal
        : kind === "english"
          ? joinedEnglish
          : joinedPersian;
    await copyText(text);
    setCopyFlash(kind);
    setTimeout(() => setCopyFlash(null), 1500);
  }

  function downloadExport(format: "txt" | "pdf") {
    if (!activeJob) return;
    const href = `/api/translator/jobs/${activeJob.id}/export?format=${format}&mode=${exportMode}`;
    window.open(href, "_blank");
  }

  const busy = isCreating || isProcessing;
  const showResults = activeJob && activeJob.status === "completed";
  const showProgress =
    activeJob &&
    activeJob.status !== "completed" &&
    !(activeJob.needs_upload && !activeJob.storage_path);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <div className="mb-8 text-center sm:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
          <IconTranslate className="h-4 w-4 text-accent" />
          Video & Audio Translator
        </div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Paste a link → get the full Persian translation
        </h1>
        <p className="mt-2 max-w-2xl text-base text-slate-400">
          Complete transcript of everything spoken — not a summary — with English
          and Persian side by side.
        </p>
      </div>

      <div className="emax-card p-5 sm:p-6">
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Paste a video or audio link
        </label>
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://youtube.com/..."
          className={touchInput}
          disabled={busy}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {detectedPlatform && (
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300">
              Source: {detectedPlatform}
            </span>
          )}
          {needsUploadHint && (
            <span className="text-sm text-amber-300/90">
              This platform may require a file upload.
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy || !url.trim()}
            className={`${touchBtnPrimary} w-full sm:w-auto`}
          >
            {busy ? "Working…" : "Generate Transcript"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowUpload(true);
              fileInputRef.current?.click();
            }}
            disabled={busy}
            className={`${touchBtnSecondary} w-full sm:w-auto`}
          >
            Upload file instead
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,.mp3,.m4a,.wav,.mp4,.mov,.webm,.ogg,.flac"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>

        {showUpload && (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            We couldn’t access the media directly from this link. Upload the
            video/audio file instead (MP3, M4A, WAV, MP4, MOV, WEBM).
            <div className="mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={touchBtnSecondary}
                disabled={busy}
              >
                Choose file
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-base text-red-300">
            {error}
            {activeJob && activeJob.status === "failed" && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={busy}
                  className={touchBtnPrimary}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showProgress && activeJob && (
        <div className="emax-card mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500">
                Processing
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {activeJob.media_title || "Media"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {STATUS_LABELS[activeJob.status] || activeJob.status_message}
                {activeJob.progress > 0 ? ` — ${activeJob.progress}%` : ""}
              </p>
            </div>
            <span className="rounded-lg border border-white/10 px-3 py-1 text-sm text-slate-300">
              {platformLabel(activeJob.source_platform)}
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${Math.max(activeJob.progress, 4)}%` }}
            />
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="text-slate-200">
                {platformLabel(activeJob.source_platform)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Detected language</dt>
              <dd className="text-slate-200">
                {activeJob.detected_language
                  ? `Detected language: ${activeJob.detected_language}`
                  : "Detecting…"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="text-slate-200">{activeJob.status_message}</dd>
            </div>
          </dl>
        </div>
      )}

      {showResults && activeJob && (
        <div className="emax-card mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {activeJob.media_title || "Transcript"}
              </h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-slate-500">Source</dt>
                  <dd className="text-slate-200">
                    {platformLabel(activeJob.source_platform)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Detected language</dt>
                  <dd className="text-slate-200">
                    {activeJob.detected_language || "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Media duration</dt>
                  <dd className="text-slate-200">
                    {formatDuration(activeJob.media_duration_seconds)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Processing status</dt>
                  <dd className="text-emerald-300">Completed</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["original", "Original"],
                ["english", "English"],
                ["persian", "فارسی"],
                ["compare", "Side-by-side"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`min-h-[40px] rounded-lg px-4 text-sm font-medium transition ${
                  tab === key
                    ? "bg-accent text-white"
                    : "border border-white/15 text-slate-300 hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-white/10 bg-navy/40 p-4">
            {tab === "compare" ? (
              <div className="grid gap-3">
                <div className="hidden grid-cols-2 gap-4 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                  <span>English</span>
                  <span>فارسی</span>
                </div>
                {activeJob.segments.map((segment) => (
                  <div
                    key={segment.id}
                    className="grid gap-2 border-b border-white/5 pb-3 sm:grid-cols-2 sm:gap-4"
                  >
                    <div>
                      {segment.start_time != null && (
                        <p className="mb-1 font-mono text-xs text-slate-500">
                          {formatTimestamp(segment.start_time)}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                        {segment.english_text}
                      </p>
                    </div>
                    <div dir="rtl">
                      {segment.start_time != null && (
                        <p className="mb-1 font-mono text-xs text-slate-500 sm:text-left">
                          {formatTimestamp(segment.start_time)}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                        {segment.persian_text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4" dir={tab === "persian" ? "rtl" : "ltr"}>
                {activeJob.segments.map((segment) => {
                  const text =
                    tab === "original"
                      ? segment.original_text
                      : tab === "english"
                        ? segment.english_text
                        : segment.persian_text;
                  return (
                    <div key={segment.id}>
                      {segment.start_time != null && (
                        <p className="mb-1 font-mono text-xs text-slate-500">
                          {formatTimestamp(segment.start_time)}
                        </p>
                      )}
                      <p className="text-base leading-relaxed text-slate-100">
                        {text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleCopy("original")}
                className={touchBtnSecondary}
              >
                {copyFlash === "original" ? "Copied" : "Copy Original"}
              </button>
              <button
                type="button"
                onClick={() => handleCopy("english")}
                className={touchBtnSecondary}
              >
                {copyFlash === "english" ? "Copied" : "Copy English"}
              </button>
              <button
                type="button"
                onClick={() => handleCopy("persian")}
                className={touchBtnSecondary}
              >
                {copyFlash === "persian" ? "Copied" : "Copy Persian"}
              </button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-sm text-slate-400">TXT export</label>
              <select
                value={exportMode}
                onChange={(event) =>
                  setExportMode(event.target.value as ExportMode)
                }
                className="emax-field min-h-[44px] text-sm text-white"
              >
                <option value="original">Original only</option>
                <option value="english">English only</option>
                <option value="persian">Persian only</option>
                <option value="english_persian">English + Persian</option>
              </select>
              <button
                type="button"
                onClick={() => downloadExport("txt")}
                className={touchBtnSecondary}
              >
                Download TXT
              </button>
              <button
                type="button"
                onClick={() => downloadExport("pdf")}
                className={touchBtnSecondary}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">Recent transcripts</h2>
        <p className="mt-1 text-sm text-slate-400">
          Open any item to view the full transcript and Persian translation.
        </p>

        {history.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No transcripts yet. Paste a link above to get started.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => openHistoryItem(job.id)}
                  className="flex w-full flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">
                      {job.media_title || "Untitled media"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {platformLabel(job.source_platform)}
                      {job.detected_language
                        ? ` · ${job.detected_language}`
                        : ""}
                      {job.media_duration_seconds
                        ? ` · ${formatDuration(job.media_duration_seconds)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={
                        job.status === "completed"
                          ? "text-emerald-300"
                          : job.status === "failed"
                            ? "text-red-300"
                            : "text-amber-300"
                      }
                    >
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                    <span className="text-slate-500">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
