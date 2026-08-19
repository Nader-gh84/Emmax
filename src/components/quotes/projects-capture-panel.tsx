"use client";

import styles from "@/components/quotes/projects-page.module.css";
import { LiveVoiceWave } from "@/components/ui/live-voice-wave";
import { formatCurrency, formatTimer, type DiscountMode, type MaterialItem } from "@/types/quote";

const IDLE_WAVE_DELAYS_LEFT = [
  0, 0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42, 0.48, 0.54, 0.6, 0.66, 0.72, 0.78,
  0.84, 0.9, 0.96, 1.02,
];
const IDLE_WAVE_DELAYS_RIGHT = [
  0.03, 0.09, 0.15, 0.21, 0.27, 0.33, 0.39, 0.45, 0.51, 0.57, 0.63, 0.69, 0.75,
  0.81, 0.87, 0.93, 0.99, 1.05,
];

function IdleWave({ side }: { side: "left" | "right" }) {
  const delays = side === "left" ? IDLE_WAVE_DELAYS_LEFT : IDLE_WAVE_DELAYS_RIGHT;
  return (
    <div
      className={`${styles.wave} ${side === "right" ? styles.waveRight : ""}`}
      aria-hidden="true"
    >
      {delays.map((delay) => (
        <i key={delay} style={{ animationDelay: `${delay}s` }} />
      ))}
    </div>
  );
}

function LiveWave({
  levels,
  listening,
}: {
  levels: number[] | null | undefined;
  listening: boolean;
}) {
  return (
    <div className={styles.liveWave} aria-hidden="true">
      <LiveVoiceWave
        mode={listening ? "listening" : "idle"}
        levels={levels}
        barCount={18}
        className="h-16 w-full gap-[3px]"
        barClassName="w-[3px] rounded-[2px] bg-gradient-to-b from-[#6BA4FF] to-[#4D8DFF]"
      />
    </div>
  );
}

export function ProjectsCapturePanel({
  projectName,
  onProjectNameChange,
  isRecording,
  isBusy,
  phase,
  seconds,
  micLevels,
  onMicClick,
  onExtractMaterials,
  hasTranscript,
  recorderError,
  actionFeedback,
  pipelineError,
  displayedTranscript,
  isEditingTranscript,
  onToggleTranscriptEdit,
  onTranscriptChange,
  materials,
  isEditingItems,
  onToggleEditItems,
  showPriceColumns,
  isMaterialsMerged,
  onToggleMerge,
  onAddManually,
  onSmartAdd,
  onUploadPricing,
  onUpdateMaterial,
  onDeleteMaterial,
  showPricingDetails,
  discountMode,
  onDiscountModeChange,
  discountAmount,
  discountPercent,
  onDiscountValueChange,
  gstRate,
  pstRate,
  onGstRateChange,
  onPstRateChange,
  materialsTotal,
  labourTotal,
  subtotal,
  discountApplied,
  gst,
  pst,
  grandTotal,
  onCalculate,
  calcFlash,
  onSaveDraft,
  onDownloadPdf,
  onSendQuote,
  onSendSupplier,
  onChangeCustomer,
  onStartOver,
  onConfirmMaterials,
  onHowItWorks,
  customerDisplay,
}: {
  projectName: string;
  onProjectNameChange: (value: string) => void;
  isRecording: boolean;
  isBusy: boolean;
  phase: "idle" | "transcribing" | "extracting" | "ready" | "error";
  seconds: number;
  micLevels: number[] | null | undefined;
  onMicClick: () => void;
  onExtractMaterials: () => void;
  hasTranscript: boolean;
  recorderError: string | null;
  actionFeedback: { type: "success" | "error" | "info"; message: string } | null;
  pipelineError: string | null;
  displayedTranscript: string;
  isEditingTranscript: boolean;
  onToggleTranscriptEdit: () => void;
  onTranscriptChange: (value: string) => void;
  materials: MaterialItem[];
  isEditingItems: boolean;
  onToggleEditItems: () => void;
  showPriceColumns: boolean;
  isMaterialsMerged: boolean;
  onToggleMerge: () => void;
  onAddManually: () => void;
  onSmartAdd: () => void;
  onUploadPricing: () => void;
  onUpdateMaterial: (id: string, field: keyof MaterialItem, value: string) => void;
  onDeleteMaterial: (id: string) => void;
  showPricingDetails: boolean;
  discountMode: DiscountMode;
  onDiscountModeChange: (mode: DiscountMode) => void;
  discountAmount: number;
  discountPercent: number;
  onDiscountValueChange: (value: number) => void;
  gstRate: number;
  pstRate: number;
  onGstRateChange: (value: number) => void;
  onPstRateChange: (value: number) => void;
  materialsTotal: number;
  labourTotal: number;
  subtotal: number;
  discountApplied: number;
  gst: number;
  pst: number;
  grandTotal: number;
  onCalculate: () => void;
  calcFlash: boolean;
  onSaveDraft: () => void;
  onDownloadPdf: () => void;
  onSendQuote: () => void;
  onSendSupplier: () => void;
  onChangeCustomer: () => void;
  onStartOver: () => void;
  onConfirmMaterials: () => void;
  onHowItWorks: () => void;
  customerDisplay: string;
}) {
  const bannerText =
    recorderError ||
    (pipelineError && actionFeedback?.type !== "error" ? pipelineError : null) ||
    actionFeedback?.message;
  const bannerTone =
    actionFeedback?.type === "error" || recorderError || pipelineError
      ? "error"
      : actionFeedback?.type === "success"
        ? "success"
        : "info";

  const listeningLabel =
    phase === "transcribing"
      ? "Transcribing…"
      : phase === "extracting"
        ? "Extracting…"
        : isRecording
          ? "Listening…"
          : hasTranscript
            ? "Ready to extract"
            : "Ready";

  const extractDisabled =
    isBusy || !hasTranscript || isRecording || phase === "transcribing";

  return (
    <section className={`${styles.card} ${styles.recorder}`}>
      <h2>Start a new project</h2>
      <p className={styles.sub}>
        Speak the materials list, Ema will turn it into a clean list for you.{" "}
        <button type="button" className={styles.howItWorks} onClick={onHowItWorks}>
          How it works?
        </button>
      </p>

      <div className={styles.titleField}>
        <label htmlFor="project-title">Project title</label>
        <input
          id="project-title"
          type="text"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="e.g. Kitchen renovation — Sara Emma"
        />
        <span className={styles.hint}>
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M7 6.2v3.4M7 4.4v.1"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          This goes on the request you send to your supplier, and becomes the project name.
        </span>
      </div>

      <div className={styles.micRow}>
        {isRecording ? (
          <LiveWave levels={micLevels} listening />
        ) : (
          <IdleWave side="left" />
        )}

        {isRecording ? (
          <button
            type="button"
            className={styles.stopBtn}
            onClick={onMicClick}
            disabled={phase === "transcribing"}
            aria-label="Stop recording"
          >
            <span className={styles.stopIcon} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.micBtn}
            onClick={onMicClick}
            disabled={phase === "transcribing" || phase === "extracting"}
            aria-label="Start recording"
          >
            {phase === "transcribing" ? (
              <span className={styles.spinner} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        )}

        {isRecording ? (
          <LiveWave levels={micLevels} listening />
        ) : (
          <IdleWave side="right" />
        )}
      </div>

      <div className={styles.recMeta}>
        <span className={`${styles.live} ${isRecording ? "" : styles.liveIdle}`}>
          {isRecording ? <span className={styles.liveDot} /> : null}
          {isRecording ? "Recording…" : listeningLabel}
        </span>
        <span className={styles.timer}>
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 4.6V8l2.2 1.4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          {formatTimer(isRecording ? seconds : 0)}
        </span>
      </div>

      <div className={styles.extractRow}>
        <button
          type="button"
          className={styles.extractBtn}
          onClick={onExtractMaterials}
          disabled={extractDisabled}
        >
          {phase === "extracting" ? (
            <>
              <span className={styles.spinner} />
              Extracting…
            </>
          ) : (
            "Extract Materials"
          )}
        </button>
      </div>

      {bannerText ? (
        <div
          className={`${styles.banner} ${
            bannerTone === "error"
              ? styles.bannerError
              : bannerTone === "success"
                ? styles.bannerSuccess
                : styles.bannerInfo
          }`}
        >
          {bannerText}
        </div>
      ) : null}

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h3>Live transcription</h3>
          <span className={`${styles.chip} ${isRecording ? "" : styles.chipMute}`}>
            {isRecording ? <span className={styles.pip} /> : null}
            {listeningLabel}
          </span>
          <div className={styles.tools}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={onToggleTranscriptEdit}
              disabled={isRecording || phase === "transcribing"}
            >
              <svg viewBox="0 0 14 14" fill="none">
                <path
                  d="M9.4 1.9 12.1 4.6M2 12l.6-2.6 7-7 2.7 2.7-7 7L2 12Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              {isEditingTranscript ? "Done" : "Edit"}
            </button>
          </div>
        </div>
        {isEditingTranscript && !isRecording ? (
          <textarea
            className={styles.transcriptEdit}
            value={displayedTranscript}
            onChange={(event) => onTranscriptChange(event.target.value)}
            placeholder="Your transcript will appear here as you speak…"
          />
        ) : (
          <div className={styles.transcript}>
            {displayedTranscript ||
              "Tap the mic and speak. Tap Stop when you pause — then Extract Materials when you're done."}
          </div>
        )}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHead}>
          <h3>Extracted materials</h3>
          <span className={`${styles.chip} ${styles.chipCount}`}>
            {materials.length} item{materials.length === 1 ? "" : "s"}
          </span>
          <div className={styles.tools}>
            <button type="button" className={styles.toolBtn} onClick={onToggleEditItems}>
              <svg viewBox="0 0 14 14" fill="none">
                <path
                  d="M9.4 1.9 12.1 4.6M2 12l.6-2.6 7-7 2.7 2.7-7 7L2 12Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              {isEditingItems ? "Done" : "Edit"}
            </button>
          </div>
        </div>

        <div className={styles.toolRow}>
          <button type="button" className={styles.toolBtn} onClick={onAddManually}>
            <svg viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2.4v9.2M2.4 7h9.2"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            Add manually
          </button>
          <button type="button" className={styles.toolBtn} onClick={onSmartAdd}>
            <svg viewBox="0 0 14 14" fill="none">
              <path d="M7 1.6 8 4.6l3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="currentColor" />
            </svg>
            Smart Add from Catalog
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={onToggleMerge}
            disabled={materials.length === 0 && !isMaterialsMerged}
          >
            {isMaterialsMerged ? "Unmerge Materials" : "Merge Materials"}
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={onUploadPricing}
            disabled={materials.length === 0}
          >
            Upload Supplier Pricing
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.idx}>#</th>
                <th>Description</th>
                <th className={styles.hideBrand}>Brand</th>
                <th className={styles.num}>Qty</th>
                <th>Unit</th>
                {showPriceColumns ? (
                  <>
                    <th className={styles.num}>Unit Price</th>
                    <th className={styles.num}>Total</th>
                    <th> </th>
                  </>
                ) : isEditingItems ? (
                  <th> </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td
                    colSpan={showPriceColumns || isEditingItems ? 8 : 5}
                    className={styles.empty}
                  >
                    No materials yet. Speak a list or add an item manually.
                  </td>
                </tr>
              ) : isMaterialsMerged ? (
                <tr>
                  <td className={styles.idx}>1</td>
                  <td className={styles.desc}>
                    Materials
                    <span className={styles.hint} style={{ marginTop: 4 }}>
                      {materials.length} items combined — Unmerge to edit details
                    </span>
                  </td>
                  <td className={styles.hideBrand}>—</td>
                  <td className={styles.qty}>1</td>
                  <td className={styles.unit}>lot</td>
                  {showPriceColumns ? (
                    <>
                      <td className={styles.num}>{formatCurrency(materialsTotal)}</td>
                      <td className={styles.num}>{formatCurrency(materialsTotal)}</td>
                      <td />
                    </>
                  ) : null}
                </tr>
              ) : (
                materials.map((item, index) => (
                  <tr key={item.id}>
                    <td className={styles.idx}>{index + 1}</td>
                    <td className={styles.desc}>
                      {isEditingItems ? (
                        <input
                          className={styles.cellInput}
                          value={item.item}
                          onChange={(event) =>
                            onUpdateMaterial(item.id, "item", event.target.value)
                          }
                        />
                      ) : (
                        item.item
                      )}
                    </td>
                    <td className={`${styles.hideBrand}`}>
                      {isEditingItems ? (
                        <input
                          className={styles.cellInput}
                          value={item.brand}
                          onChange={(event) =>
                            onUpdateMaterial(item.id, "brand", event.target.value)
                          }
                        />
                      ) : (
                        item.brand || "—"
                      )}
                    </td>
                    <td className={styles.qty}>
                      {isEditingItems ? (
                        <input
                          className={styles.cellInput}
                          type="number"
                          value={item.quantity}
                          onChange={(event) =>
                            onUpdateMaterial(item.id, "quantity", event.target.value)
                          }
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className={styles.unit}>
                      {isEditingItems ? (
                        <input
                          className={styles.cellInput}
                          value={item.unit}
                          onChange={(event) =>
                            onUpdateMaterial(item.id, "unit", event.target.value)
                          }
                        />
                      ) : (
                        item.unit
                      )}
                    </td>
                    {showPriceColumns ? (
                      <>
                        <td className={styles.num}>
                          {isEditingItems ? (
                            <input
                              className={styles.cellInput}
                              type="number"
                              value={item.unitPrice}
                              onChange={(event) =>
                                onUpdateMaterial(item.id, "unitPrice", event.target.value)
                              }
                            />
                          ) : (
                            formatCurrency(item.unitPrice)
                          )}
                        </td>
                        <td className={styles.num}>
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={`Delete ${item.item}`}
                            onClick={() => onDeleteMaterial(item.id)}
                          >
                            ×
                          </button>
                        </td>
                      </>
                    ) : isEditingItems ? (
                      <td>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label={`Delete ${item.item}`}
                          onClick={() => onDeleteMaterial(item.id)}
                        >
                          ×
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPricingDetails ? (
        <details className={styles.disclosure}>
          <summary>Pricing details</summary>
          <div className={styles.disclosureBody}>
            <div className={styles.toolRow} style={{ paddingLeft: 0, paddingRight: 0, border: 0 }}>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={onCalculate}
                style={calcFlash ? { borderColor: "rgba(107,164,255,0.7)" } : undefined}
              >
                Calculate
              </button>
            </div>
            <p className={styles.hint}>Tax, discount, and totals are used when you Create Quote.</p>
            <div className={styles.pFacts} style={{ marginTop: 12 }}>
              <span>Materials {formatCurrency(materialsTotal)}</span>
              <span>Labour {formatCurrency(labourTotal)}</span>
              <span>Subtotal {formatCurrency(subtotal)}</span>
            </div>
            <div className={styles.toolRow} style={{ paddingLeft: 0, paddingRight: 0, border: 0 }}>
              <span className={styles.chipMute}>Discount</span>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => onDiscountModeChange("amount")}
              >
                {discountMode === "amount" ? "• $" : "$"}
              </button>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => onDiscountModeChange("percent")}
              >
                {discountMode === "percent" ? "• %" : "%"}
              </button>
              <input
                className={styles.cellInput}
                style={{ width: 88 }}
                type="number"
                min={0}
                step="0.01"
                value={discountMode === "amount" ? discountAmount : discountPercent}
                onChange={(event) =>
                  onDiscountValueChange(parseFloat(event.target.value) || 0)
                }
              />
              <span className={styles.hint} style={{ marginTop: 0 }}>
                Applied {formatCurrency(discountApplied)}
              </span>
            </div>
            <div className={styles.pFacts}>
              <label>
                GST{" "}
                <input
                  className={styles.cellInput}
                  style={{ width: 56, display: "inline-block" }}
                  type="number"
                  value={gstRate}
                  onChange={(event) =>
                    onGstRateChange(parseFloat(event.target.value) || 0)
                  }
                />
                % {formatCurrency(gst)}
              </label>
              <label>
                PST{" "}
                <input
                  className={styles.cellInput}
                  style={{ width: 56, display: "inline-block" }}
                  type="number"
                  value={pstRate}
                  onChange={(event) =>
                    onPstRateChange(parseFloat(event.target.value) || 0)
                  }
                />
                % {formatCurrency(pst)}
              </label>
              <strong>Grand total {formatCurrency(grandTotal)} CAD</strong>
            </div>
          </div>
        </details>
      ) : null}

      <div className={styles.quoteActions}>
        <button type="button" className={styles.toolBtn} onClick={onSaveDraft} disabled={isBusy}>
          Save draft
        </button>
        <button type="button" className={styles.toolBtn} onClick={onDownloadPdf} disabled={isBusy}>
          Download PDF
        </button>
        <button type="button" className={styles.toolBtn} onClick={onSendQuote} disabled={isBusy}>
          Send Quote
        </button>
        <button type="button" className={styles.toolBtn} onClick={onSendSupplier} disabled={isBusy}>
          Send to Supplier
        </button>
        <button type="button" className={styles.toolBtn} onClick={onChangeCustomer}>
          Customer: {customerDisplay}
        </button>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btnGhost} onClick={onStartOver} disabled={isBusy}>
          <svg viewBox="0 0 16 16" fill="none">
            <path
              d="M2.4 8a5.6 5.6 0 1 0 1.7-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M2.2 1.8v3.4h3.4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Start Over
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={onConfirmMaterials}
          disabled={isBusy}
        >
          <svg viewBox="0 0 18 18" fill="none">
            <path
              d="m3.6 9.4 3.4 3.4 7.4-7.4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Confirm Materials
        </button>
      </div>
    </section>
  );
}
