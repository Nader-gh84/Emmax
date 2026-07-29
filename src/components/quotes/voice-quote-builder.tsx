"use client";

import { useCallback, useMemo, useState } from "react";
import {
  IconDocument,
  IconEmployee,
  IconMicrophone,
  IconSuppliers,
  IconUsers,
} from "@/components/dashboard/icons";
import {
  IconMail,
  IconPhone,
  IconSend,
  IconSparkle,
} from "@/components/dashboard/workspace-icons";
import {
  CustomerSelectModal,
  NotesEditModal,
  ProjectEditModal,
  SendQuoteModal,
  SupplierSelectModal,
  ValidUntilModal,
} from "@/components/quotes/voice-quote-action-modals";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
} from "@/components/quotes/ui";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import {
  saveQuoteDraft,
  sendQuoteEmailAndPersist,
  type QuoteActionState,
} from "@/lib/quote-actions";
import { mapExtractionToLineItems } from "@/lib/quote-extraction";
import {
  buildSupplierMaterialsEmail,
  downloadPdfBlob,
  fetchQuotePdfBlob,
} from "@/lib/quote-pdf-client";
import {
  defaultValidUntil,
  formatValidUntilLabel,
  type CustomerSelectionMode,
  type PriceDisplayMode,
} from "@/lib/quotes";
import { getCustomerDisplayName, type Customer } from "@/types/customer";
import type { Supplier } from "@/types/supplier";
import {
  DiscountMode,
  LabourItem,
  MaterialItem,
  calculateVoiceQuoteTotals,
  createLabourItem,
  createMaterialItem,
  formatCurrency,
  formatTimer,
  labourLineTotal,
  materialLineTotal,
} from "@/types/quote";

type PipelinePhase =
  | "idle"
  | "transcribing"
  | "extracting"
  | "ready"
  | "error";

type AddItemKind = "material" | "labour";
type ActiveModal =
  | null
  | "customer"
  | "project"
  | "validUntil"
  | "sendContact"
  | "sendNew"
  | "supplier"
  | "notes";

const ACTIONS = [
  { id: "download", label: "Download PDF", icon: IconDocument },
  { id: "draft", label: "Save to Draft", icon: IconBookmark },
  { id: "edit", label: "Edit", icon: IconPencil },
  { id: "contact", label: "Send to Contact", icon: IconSend },
  { id: "new-customer", label: "Send to New Customer", icon: IconUserPlus },
  { id: "supplier", label: "Send to Supplier", icon: IconSuppliers },
] as const;

type ActionId = (typeof ACTIONS)[number]["id"];

const DEFAULT_GST_RATE = 5;
const DEFAULT_PST_RATE = 7;

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function IconBookmark({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function IconUserPlus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconMerge({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconLightbulb({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function IconCatalog({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h10" />
    </svg>
  );
}

type TableRow =
  | { kind: "material"; item: MaterialItem }
  | { kind: "labour"; item: LabourItem };

export function VoiceQuoteBuilder() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [labourItems, setLabourItems] = useState<LabourItem[]>([]);
  const [phase, setPhase] = useState<PipelinePhase>("idle");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceDisplayMode>("detailed");
  const [mobileAction, setMobileAction] = useState<ActionId | "">("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [gstRate, setGstRate] = useState(DEFAULT_GST_RATE);
  const [pstRate, setPstRate] = useState(DEFAULT_PST_RATE);
  const [calcFlash, setCalcFlash] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"draft" | "sent">("draft");
  const [customerMode, setCustomerMode] =
    useState<CustomerSelectionMode>("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSecondary, setCustomerSecondary] = useState("");
  const [projectName, setProjectName] = useState("");
  const [validUntil, setValidUntil] = useState<string | null>(
    defaultValidUntil(30)
  );

  const processTranscript = useCallback(
    async (nextTranscript: string, append: boolean) => {
      setPhase("extracting");
      setPipelineError(null);

      try {
        const response = await fetch("/api/extract-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: nextTranscript }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.error ||
              "Couldn't parse that, try again or add items manually"
          );
        }

        const mapped = mapExtractionToLineItems(
          data.materials ?? [],
          data.labourItems ?? [],
          data.scopeOfWork ?? ""
        );

        if (append) {
          setMaterials((current) => [...current, ...mapped.materials]);
          setLabourItems((current) => [...current, ...mapped.labourItems]);
          setNotes((current) =>
            [current, mapped.scopeOfWork].filter(Boolean).join("\n\n")
          );
        } else {
          setMaterials(mapped.materials);
          setLabourItems(mapped.labourItems);
          setNotes(mapped.scopeOfWork);
        }

        setPhase("ready");
      } catch (error) {
        setPhase("error");
        setPipelineError(
          error instanceof Error
            ? error.message
            : "Couldn't parse that, try again or add items manually"
        );
      }
    },
    []
  );

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      const append = Boolean(transcript.trim()) || materials.length > 0 || labourItems.length > 0;
      setPhase("transcribing");
      setPipelineError(null);
      setIsEditingTranscript(false);

      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("extract", "false");

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Transcription failed");
        }

        const nextChunk =
          typeof data.transcript === "string" ? data.transcript.trim() : "";
        if (!nextChunk) {
          throw new Error("No transcript returned. Please try again.");
        }

        const combinedTranscript = append
          ? [transcript.trim(), nextChunk].filter(Boolean).join(" ")
          : nextChunk;

        setTranscript(combinedTranscript);
        await processTranscript(nextChunk, append);
      } catch (error) {
        setPhase("error");
        setPipelineError(
          error instanceof Error ? error.message : "Failed to process recording"
        );
      }
    },
    [labourItems.length, materials.length, processTranscript, transcript]
  );

  const {
    status: recorderStatus,
    error: recorderError,
    seconds,
    startRecording,
    stopRecording,
  } = useVoiceRecorder({
    onRecordingComplete: handleRecordingComplete,
    silenceDurationMs: 2000,
  });

  const isRecording = recorderStatus === "recording";
  const isBusy =
    isRecording || phase === "transcribing" || phase === "extracting";

  const totals = useMemo(
    () =>
      calculateVoiceQuoteTotals({
        materials,
        labourItems,
        gstRate,
        pstRate,
        discountMode,
        discountAmount,
        discountPercent,
      }),
    [
      materials,
      labourItems,
      gstRate,
      pstRate,
      discountMode,
      discountAmount,
      discountPercent,
    ]
  );

  const tableRows: TableRow[] = useMemo(
    () => [
      ...materials.map((item) => ({ kind: "material" as const, item })),
      ...labourItems.map((item) => ({ kind: "labour" as const, item })),
    ],
    [materials, labourItems]
  );

  const itemCount = tableRows.length;

  async function handleMicClick() {
    if (phase === "transcribing" || phase === "extracting") return;
    if (isRecording) {
      await stopRecording();
      return;
    }
    await startRecording();
  }

  function handleContinueSpeaking() {
    if (isBusy) return;
    void startRecording();
  }

  function updateMaterial(
    id: string,
    field: keyof MaterialItem,
    value: string
  ) {
    setMaterials((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (field === "quantity" || field === "unitPrice") {
          return { ...item, [field]: parseFloat(value) || 0 };
        }
        return { ...item, [field]: value };
      })
    );
  }

  function updateLabour(id: string, field: keyof LabourItem, value: string) {
    setLabourItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (field === "hours" || field === "rate") {
          return { ...item, [field]: parseFloat(value) || 0 };
        }
        return { ...item, [field]: value };
      })
    );
  }

  function deleteRow(row: TableRow) {
    if (row.kind === "material") {
      setMaterials((current) => current.filter((item) => item.id !== row.item.id));
    } else {
      setLabourItems((current) =>
        current.filter((item) => item.id !== row.item.id)
      );
    }
  }

  function handleAddItem(payload: {
    kind: AddItemKind;
    description: string;
    brand: string;
    qty: number;
    unit: string;
    unitPrice: number;
  }) {
    if (payload.kind === "labour") {
      setLabourItems((current) => [
        ...current,
        createLabourItem({
          description: payload.description,
          hours: payload.qty,
          rate: payload.unitPrice,
        }),
      ]);
    } else {
      setMaterials((current) => [
        ...current,
        createMaterialItem({
          item: payload.description,
          brand: payload.brand,
          quantity: payload.qty,
          unit: payload.unit,
          unitPrice: payload.unitPrice,
        }),
      ]);
    }
    setShowAddItem(false);
    if (phase === "idle" || phase === "error") setPhase("ready");
  }

  function handleCalculate() {
    setCalcFlash(true);
    window.setTimeout(() => setCalcFlash(false), 600);
  }

  function showFeedback(
    type: "success" | "error" | "info",
    message: string
  ) {
    setActionFeedback({ type, message });
  }

  function buildActionState(): QuoteActionState {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let validityDays = 30;
    if (validUntil) {
      const target = new Date(`${validUntil}T00:00:00`);
      if (!Number.isNaN(target.getTime())) {
        validityDays = Math.max(
          0,
          Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        );
      }
    }

    return {
      quoteId,
      quoteNumber,
      transcript,
      materials,
      labourItems,
      taxRate: gstRate + pstRate,
      gstRate,
      pstRate,
      discountMode,
      discountAmount,
      discountPercent,
      customerMode,
      selectedCustomerId,
      customerName,
      customerEmail,
      customerPhone,
      projectName,
      notes,
      validityDays,
      validUntil,
      priceDisplayMode: priceMode,
    };
  }

  function requireLineItems(): boolean {
    if (materials.length === 0 && labourItems.length === 0) {
      showFeedback(
        "error",
        "Add at least one material or labour item first."
      );
      return false;
    }
    return true;
  }

  async function handleDownloadPdf() {
    if (!requireLineItems()) return;
    setIsActionBusy(true);
    setActionFeedback(null);
    try {
      const state = buildActionState();
      const blob = await fetchQuotePdfBlob({
        materials: state.materials,
        labourItems: state.labourItems,
        taxRate: state.taxRate,
        gstRate: state.gstRate,
        pstRate: state.pstRate,
        discountMode: state.discountMode,
        discountAmount: state.discountAmount,
        discountPercent: state.discountPercent,
        customerName: state.customerName,
        customerEmail: state.customerEmail,
        customerPhone: state.customerPhone,
        projectName: state.projectName,
        notes: state.notes,
        validityDays: state.validityDays,
        validUntil: state.validUntil,
        priceDisplayMode: state.priceDisplayMode,
        quoteNumber: state.quoteNumber,
        allowDraftPlaceholders: true,
      });
      downloadPdfBlob(
        blob,
        `${state.quoteNumber || "quote-draft"}.pdf`
      );
      showFeedback("success", "PDF downloaded.");
    } catch (error) {
      showFeedback(
        "error",
        error instanceof Error ? error.message : "Failed to generate PDF"
      );
    } finally {
      setIsActionBusy(false);
    }
  }

  async function handleSaveDraft() {
    if (!requireLineItems()) return;
    setIsActionBusy(true);
    setActionFeedback(null);
    try {
      const result = await saveQuoteDraft(buildActionState());
      setQuoteId(result.quoteId);
      setQuoteNumber(result.quoteNumber);
      showFeedback(
        "success",
        result.quoteNumber
          ? `Saved as draft ${result.quoteNumber}.`
          : "Saved to Drafts."
      );
    } catch (error) {
      showFeedback(
        "error",
        error instanceof Error ? error.message : "Failed to save draft"
      );
    } finally {
      setIsActionBusy(false);
    }
  }

  function handleEditAction() {
    setIsEditingItems(true);
    setIsEditingTranscript(true);
    showFeedback(
      "info",
      "Editing enabled — update the transcript or item rows, then tap Done."
    );
  }

  async function handleSendQuote() {
    if (!requireLineItems()) return;
    setIsActionBusy(true);
    setActionFeedback(null);
    try {
      const result = await sendQuoteEmailAndPersist(buildActionState());
      setQuoteId(result.quoteId);
      setQuoteNumber(result.quoteNumber);
      setActiveModal(null);
      setQuoteStatus("sent");
      showFeedback(
        "success",
        `Quote sent to ${customerEmail.trim()}.`
      );
    } catch (error) {
      showFeedback(
        "error",
        error instanceof Error ? error.message : "Failed to send quote"
      );
    } finally {
      setIsActionBusy(false);
    }
  }

  function handleSupplierShare(supplier: Supplier) {
    if (materials.length === 0) {
      showFeedback(
        "error",
        "Add at least one material before sharing with a supplier."
      );
      return;
    }

    if (!supplier.email?.trim()) {
      showFeedback(
        "error",
        `${supplier.supplier_name} has no email on file. Add one on the Suppliers page.`
      );
      return;
    }

    const href = buildSupplierMaterialsEmail({
      supplierName: supplier.supplier_name,
      supplierEmail: supplier.email,
      projectName,
      materials,
    });
    window.location.href = href;
    setActiveModal(null);
    showFeedback(
      "success",
      `Opened email draft for ${supplier.supplier_name}.`
    );
  }

  function handleSelectCustomer(customer: Customer) {
    setCustomerMode("existing");
    setSelectedCustomerId(customer.id);
    setCustomerName(getCustomerDisplayName(customer));
    setCustomerEmail(customer.email ?? "");
    setCustomerPhone(customer.phone ?? "");
    setCustomerSecondary(customer.notes?.trim() || customer.email || "");
    setActiveModal(null);
  }

  function handleCustomerFieldChange(
    field: "customerName" | "customerEmail" | "customerPhone",
    value: string
  ) {
    if (field === "customerName") setCustomerName(value);
    if (field === "customerEmail") setCustomerEmail(value);
    if (field === "customerPhone") setCustomerPhone(value);
  }

  async function runAction(actionId: ActionId) {
    if (isActionBusy) return;

    switch (actionId) {
      case "download":
        await handleDownloadPdf();
        break;
      case "draft":
        await handleSaveDraft();
        break;
      case "edit":
        handleEditAction();
        break;
      case "contact":
        setCustomerMode("existing");
        setActiveModal("sendContact");
        break;
      case "new-customer":
        setCustomerMode("new");
        setSelectedCustomerId(null);
        setActiveModal("sendNew");
        break;
      case "supplier":
        setActiveModal("supplier");
        break;
      default:
        break;
    }
  }

  function handleSmartAdd() {
    showFeedback(
      "info",
      "Smart Add from Catalog isn’t available yet — no catalog lookup exists in the app. Add items manually for now."
    );
  }

  const customerDisplay =
    customerName.trim() || "No customer selected";
  const customerDisplaySecondary = customerSecondary.trim();
  const projectDisplay = projectName.trim() || "No project set";
  const validUntilDisplay = formatValidUntilLabel(validUntil);

  const statusCard = (() => {
    if (phase === "transcribing") {
      return {
        title: "Ema is listening to your recording",
        detail: "Transcribing with Whisper…",
        footer: null as string | null,
        footerTone: "cyan" as const,
      };
    }
    if (phase === "extracting") {
      return {
        title: "Ema is building your pre-invoice",
        detail: "Extracting materials and labour with GPT-4o…",
        footer: null,
        footerTone: "cyan" as const,
      };
    }
    if (phase === "error") {
      return {
        title: "Couldn’t finish extraction",
        detail:
          pipelineError ||
          "Couldn't parse that, try again or add items manually",
        footer: "Try recording again or add items manually",
        footerTone: "red" as const,
      };
    }
    if (phase === "ready") {
      return {
        title: "Ema has generated your pre-invoice",
        detail: `${itemCount} item${itemCount === 1 ? "" : "s"} added`,
        footer: "Pre-invoice generated successfully!",
        footerTone: "emerald" as const,
      };
    }
    return {
      title: "Ready when you are",
      detail: "Tap the mic and describe materials, quantities, and labour.",
      footer: null,
      footerTone: "cyan" as const,
    };
  })();

  return (
    <div className="flex min-h-full min-w-0 flex-1">
      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Voice Quote Builder
              </h1>
              <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
                Beta
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Speak naturally and Ema will build the pre-invoice for you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className={`${touchBtnSecondary} gap-2 text-sm`}
          >
            <IconInfo className="h-4 w-4" />
            How it works?
          </button>
        </header>

        {(recorderError || actionFeedback) && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              actionFeedback?.type === "error" || recorderError
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : actionFeedback?.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {recorderError || actionFeedback?.message}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  <span className="mr-2 text-accent">1</span>
                  Record Your Voice
                </h2>
                {isRecording && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => void handleMicClick()}
                  disabled={phase === "transcribing" || phase === "extracting"}
                  className={`flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition disabled:opacity-50 ${
                    isRecording
                      ? "bg-red-500 shadow-red-500/30 ring-4 ring-red-500/20"
                      : "bg-accent shadow-accent/30 ring-4 ring-accent/20 hover:bg-blue-600"
                  }`}
                  aria-label={isRecording ? "Stop recording" : "Start recording"}
                >
                  {phase === "transcribing" || phase === "extracting" ? (
                    <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                  ) : (
                    <IconMicrophone className="h-10 w-10 text-white" />
                  )}
                </button>
                <p className="mt-3 text-sm font-medium text-slate-300">
                  {phase === "transcribing"
                    ? "Transcribing…"
                    : phase === "extracting"
                      ? "Extracting…"
                      : isRecording
                        ? "Tap to stop"
                        : "Tap to record"}
                </p>

                <div className="mt-5 flex h-12 w-full items-end justify-center gap-1 rounded-xl border border-white/10 bg-navy/50 px-3 py-2">
                  {Array.from({ length: 24 }).map((_, index) => (
                    <span
                      key={index}
                      className={`w-1 rounded-full bg-cyan-400/80 ${
                        isRecording ? "animate-waveform" : "opacity-40"
                      }`}
                      style={{
                        height: `${20 + ((index * 17) % 60)}%`,
                        animationDelay: `${index * 0.05}s`,
                      }}
                    />
                  ))}
                </div>

                <p className="mt-3 font-mono text-2xl font-bold text-white">
                  {formatTimer(isRecording ? seconds : 0)}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <IconCheck className="h-3 w-3" />
                  </span>
                  Auto-stop: 2 sec silence
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  <span className="mr-2 text-accent">2</span>
                  Your Transcript
                </h2>
                <button
                  type="button"
                  onClick={() => setIsEditingTranscript((current) => !current)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-blue-400"
                >
                  <IconPencil className="h-3.5 w-3.5" />
                  {isEditingTranscript ? "Done" : "Edit"}
                </button>
              </div>

              {phase === "transcribing" && !transcript ? (
                <div className="mt-4 flex items-center gap-3 text-sm text-slate-400">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
                  Transcribing your recording…
                </div>
              ) : isEditingTranscript ? (
                <textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="Your transcript will appear here…"
                  className="mt-4 min-h-[120px] w-full rounded-xl border border-white/10 bg-navy/40 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-accent"
                />
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                  {transcript ||
                    "Tap the mic to start. Your transcript will show up here."}
                </p>
              )}

              {isEditingTranscript && transcript.trim() && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setIsEditingTranscript(false);
                    void processTranscript(transcript.trim(), false);
                  }}
                  className={`${touchBtnSecondary} mt-3 w-full text-xs`}
                >
                  Re-extract from transcript
                </button>
              )}
            </section>
          </div>

          <div className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 via-white/[0.04] to-cyan-500/10 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-cyan-400 text-sm font-bold text-white shadow-lg shadow-accent/30">
                  {phase === "transcribing" || phase === "extracting" ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    "Ema"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-white sm:text-lg">
                    {statusCard.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">{statusCard.detail}</p>
                  {phase === "ready" && (
                    <p className="mt-1 text-sm text-slate-400">
                      You can edit items, merge materials or continue speaking.
                    </p>
                  )}
                  {statusCard.footer && (
                    <p
                      className={`mt-3 inline-flex items-center gap-2 text-sm font-medium ${
                        statusCard.footerTone === "emerald"
                          ? "text-emerald-400"
                          : statusCard.footerTone === "red"
                            ? "text-red-400"
                            : "text-cyan-400"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          statusCard.footerTone === "emerald"
                            ? "bg-emerald-500/20"
                            : statusCard.footerTone === "red"
                              ? "bg-red-500/20"
                              : "bg-cyan-500/20"
                        }`}
                      >
                        {statusCard.footerTone === "red" ? "!" : (
                          <IconCheck className="h-3.5 w-3.5" />
                        )}
                      </span>
                      {statusCard.footer}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-sm font-semibold text-white">
                  <span className="mr-2 text-accent">4</span>
                  Your Pre-Invoice
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingItems((current) => !current)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-blue-400"
                  >
                    <IconPencil className="h-3.5 w-3.5" />
                    {isEditingItems ? "Done Editing" : "Edit Items"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode("merged")}
                    className={`${touchBtnSecondary} gap-2 px-3 py-2 text-xs`}
                    title="Combine materials into a single line on the customer-facing quote"
                  >
                    <IconMerge className="h-3.5 w-3.5" />
                    Merge Materials
                    <IconInfo className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-3 pr-2 font-medium">#</th>
                      <th className="pb-3 pr-2 font-medium">Description</th>
                      <th className="pb-3 pr-2 font-medium">Brand</th>
                      <th className="pb-3 pr-2 font-medium">Qty</th>
                      <th className="pb-3 pr-2 font-medium">Unit</th>
                      <th className="pb-3 pr-2 font-medium">Unit Price</th>
                      <th className="pb-3 pr-2 font-medium">Total</th>
                      <th className="pb-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-8 text-center text-sm text-slate-500"
                        >
                          No items yet. Record a quote or add an item manually.
                        </td>
                      </tr>
                    ) : (
                      tableRows.map((row, index) => {
                        if (row.kind === "material") {
                          const item = row.item;
                          return (
                            <tr key={item.id} className="border-b border-white/5">
                              <td className="py-3 pr-2 text-slate-500">
                                {index + 1}
                              </td>
                              <td className="py-3 pr-2 font-medium text-white">
                                {isEditingItems ? (
                                  <input
                                    value={item.item}
                                    onChange={(event) =>
                                      updateMaterial(
                                        item.id,
                                        "item",
                                        event.target.value
                                      )
                                    }
                                    className={`${touchInput} min-h-[36px] px-2 py-1 text-sm`}
                                  />
                                ) : (
                                  item.item
                                )}
                              </td>
                              <td className="py-3 pr-2 text-slate-300">
                                {isEditingItems ? (
                                  <input
                                    value={item.brand}
                                    onChange={(event) =>
                                      updateMaterial(
                                        item.id,
                                        "brand",
                                        event.target.value
                                      )
                                    }
                                    className={`${touchInput} min-h-[36px] px-2 py-1 text-sm`}
                                  />
                                ) : (
                                  item.brand || "—"
                                )}
                              </td>
                              <td className="py-3 pr-2 text-slate-300">
                                {isEditingItems ? (
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(event) =>
                                      updateMaterial(
                                        item.id,
                                        "quantity",
                                        event.target.value
                                      )
                                    }
                                    className={`${touchInput} min-h-[36px] w-20 px-2 py-1 text-sm`}
                                  />
                                ) : (
                                  item.quantity
                                )}
                              </td>
                              <td className="py-3 pr-2 text-slate-300">
                                {isEditingItems ? (
                                  <input
                                    value={item.unit}
                                    onChange={(event) =>
                                      updateMaterial(
                                        item.id,
                                        "unit",
                                        event.target.value
                                      )
                                    }
                                    className={`${touchInput} min-h-[36px] w-20 px-2 py-1 text-sm`}
                                  />
                                ) : (
                                  item.unit
                                )}
                              </td>
                              <td className="py-3 pr-2 text-slate-300">
                                {isEditingItems ? (
                                  <input
                                    type="number"
                                    value={item.unitPrice}
                                    onChange={(event) =>
                                      updateMaterial(
                                        item.id,
                                        "unitPrice",
                                        event.target.value
                                      )
                                    }
                                    className={`${touchInput} min-h-[36px] w-24 px-2 py-1 text-sm`}
                                  />
                                ) : (
                                  formatCurrency(item.unitPrice)
                                )}
                              </td>
                              <td className="py-3 pr-2 font-medium text-white">
                                {formatCurrency(materialLineTotal(item))}
                              </td>
                              <td className="py-3">
                                <button
                                  type="button"
                                  onClick={() => deleteRow(row)}
                                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                                  aria-label={`Delete ${item.item}`}
                                >
                                  <IconTrash className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        }

                        const item = row.item;
                        return (
                          <tr key={item.id} className="border-b border-white/5">
                            <td className="py-3 pr-2 text-slate-500">
                              {index + 1}
                            </td>
                            <td className="py-3 pr-2 font-medium text-white">
                              {isEditingItems ? (
                                <input
                                  value={item.description}
                                  onChange={(event) =>
                                    updateLabour(
                                      item.id,
                                      "description",
                                      event.target.value
                                    )
                                  }
                                  className={`${touchInput} min-h-[36px] px-2 py-1 text-sm`}
                                />
                              ) : (
                                item.description
                              )}
                            </td>
                            <td className="py-3 pr-2 text-slate-300">
                              <span className="inline-flex items-center gap-1.5 text-cyan-400">
                                <IconEmployee className="h-4 w-4" />
                                Labour
                              </span>
                            </td>
                            <td className="py-3 pr-2 text-slate-300">
                              {isEditingItems ? (
                                <input
                                  type="number"
                                  value={item.hours}
                                  onChange={(event) =>
                                    updateLabour(
                                      item.id,
                                      "hours",
                                      event.target.value
                                    )
                                  }
                                  className={`${touchInput} min-h-[36px] w-20 px-2 py-1 text-sm`}
                                />
                              ) : (
                                item.hours
                              )}
                            </td>
                            <td className="py-3 pr-2 text-slate-300">hour</td>
                            <td className="py-3 pr-2 text-slate-300">
                              {isEditingItems ? (
                                <input
                                  type="number"
                                  value={item.rate}
                                  onChange={(event) =>
                                    updateLabour(
                                      item.id,
                                      "rate",
                                      event.target.value
                                    )
                                  }
                                  className={`${touchInput} min-h-[36px] w-24 px-2 py-1 text-sm`}
                                />
                              ) : (
                                formatCurrency(item.rate)
                              )}
                            </td>
                            <td className="py-3 pr-2 font-medium text-white">
                              {formatCurrency(labourLineTotal(item))}
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => deleteRow(row)}
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                                aria-label={`Delete ${item.description}`}
                              >
                                <IconTrash className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowAddItem(true)}
                  className={`${touchBtnSecondary} gap-2`}
                >
                  + Add item manually
                </button>
                <button
                  type="button"
                  onClick={handleSmartAdd}
                  className={`${touchBtnSecondary} gap-2`}
                >
                  <IconCatalog className="h-4 w-4" />
                  Smart Add from Catalog
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">Summary</h2>
                <button
                  type="button"
                  onClick={handleCalculate}
                  className={`${touchBtnPrimary} px-4 py-2 text-sm ${
                    calcFlash ? "ring-2 ring-cyan-300" : ""
                  }`}
                >
                  Calculate
                </button>
              </div>

              <div className="mt-5 grid gap-6 md:grid-cols-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Materials Total</span>
                    <span className="text-white">
                      {formatCurrency(totals.materialsTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Labour Total</span>
                    <span className="text-white">
                      {formatCurrency(totals.labourTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-slate-400">Discount</span>
                      <div className="flex rounded-lg border border-white/10 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setDiscountMode("amount")}
                          className={`rounded-md px-2 py-1 ${
                            discountMode === "amount"
                              ? "bg-accent text-white"
                              : "text-slate-400"
                          }`}
                        >
                          $
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountMode("percent")}
                          className={`rounded-md px-2 py-1 ${
                            discountMode === "percent"
                              ? "bg-accent text-white"
                              : "text-slate-400"
                          }`}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-white">
                      <span>
                        {discountMode === "amount" ? "$ amount" : "% off"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={
                          discountMode === "amount"
                            ? discountAmount
                            : discountPercent
                        }
                        onChange={(event) => {
                          const value = parseFloat(event.target.value) || 0;
                          if (discountMode === "amount") {
                            setDiscountAmount(value);
                          } else {
                            setDiscountPercent(value);
                          }
                        }}
                        className={`${touchInput} min-h-[36px] w-28 px-2 py-1 text-right text-sm`}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-slate-500">
                      Applied: {formatCurrency(totals.discountApplied)}
                    </p>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      GST
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={gstRate}
                        onChange={(event) =>
                          setGstRate(parseFloat(event.target.value) || 0)
                        }
                        className={`${touchInput} min-h-[28px] w-14 px-1.5 py-0.5 text-xs`}
                        aria-label="GST rate"
                      />
                      %
                    </span>
                    <span className="text-white">
                      {formatCurrency(totals.gst)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      PST
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={pstRate}
                        onChange={(event) =>
                          setPstRate(parseFloat(event.target.value) || 0)
                        }
                        className={`${touchInput} min-h-[28px] w-14 px-1.5 py-0.5 text-xs`}
                        aria-label="PST rate"
                      />
                      %
                    </span>
                    <span className="text-white">
                      {formatCurrency(totals.pst)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-center rounded-xl border border-accent/20 bg-accent/10 px-4 py-5 text-center md:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Grand Total
                  </p>
                  <p className="mt-1 text-3xl font-bold text-accent">
                    {formatCurrency(totals.grandTotal)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-cyan-400">CAD</p>
                </div>
              </div>
            </section>

            <section className="hidden gap-2 md:grid md:grid-cols-3 lg:grid-cols-6">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={isActionBusy}
                    onClick={() => void runAction(action.id)}
                    className={`${touchBtnSecondary} flex-col gap-1.5 px-2 py-3 text-xs disabled:opacity-50`}
                  >
                    <Icon className="h-4 w-4 text-cyan-400" />
                    {action.label}
                  </button>
                );
              })}
            </section>

            <section className="flex gap-2 md:hidden">
              <select
                value={mobileAction}
                onChange={(event) =>
                  setMobileAction(event.target.value as ActionId | "")
                }
                className="min-h-[44px] flex-1 rounded-xl border border-white/20 bg-white/5 px-3 text-sm text-white outline-none focus:border-accent"
              >
                <option value="" className="bg-navy">
                  Choose action...
                </option>
                {ACTIONS.map((action) => (
                  <option key={action.id} value={action.id} className="bg-navy">
                    {action.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!mobileAction || isActionBusy}
                onClick={() => {
                  if (!mobileAction) return;
                  void runAction(mobileAction);
                }}
                className={`${touchBtnPrimary} px-5 disabled:opacity-40`}
              >
                {isActionBusy ? "…" : "Send"}
              </button>
            </section>

            <section className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleContinueSpeaking}
                disabled={isBusy}
                className="flex items-center gap-3 text-left transition hover:opacity-90 disabled:opacity-50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <IconMicrophone className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">
                    Continue Speaking
                  </span>
                  <span className="block text-xs text-slate-400">
                    Add more items or make changes
                  </span>
                </span>
                <IconChevron className="ml-1 h-4 w-4 text-slate-500" />
              </button>

              <p className="inline-flex items-start gap-2 text-xs text-slate-400 sm:max-w-xs">
                <IconLightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                Tip: Be specific about brand, size, quantity and work type for
                better results.
              </p>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-blue-400"
              >
                <IconSparkle className="h-4 w-4" />
                Need help? Ask Ema
              </button>
            </section>

            {!showSidebar && (
              <button
                type="button"
                onClick={() => setShowSidebar(true)}
                className={`${touchBtnSecondary} hidden xl:inline-flex`}
              >
                Show Pre-Invoice Details
              </button>
            )}
          </div>
        </div>
      </div>

      {showSidebar && (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-white/10 bg-[#0B1220] xl:flex">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Pre-Invoice Details
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                  {quoteNumber || "Q-····-····"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                    quoteStatus === "sent"
                      ? "bg-blue-500/15 text-blue-300 ring-blue-500/30"
                      : "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                  }`}
                >
                  {quoteStatus === "sent" ? "Sent" : "Draft"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSidebar(false)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Close details"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {[
              {
                label: "Customer",
                value: customerDisplay,
                secondary: customerDisplaySecondary,
                onChange: () => setActiveModal("customer"),
              },
              {
                label: "Project",
                value: projectDisplay,
                secondary: "",
                onChange: () => setActiveModal("project"),
              },
              {
                label: "Valid Until",
                value: validUntilDisplay,
                secondary: "",
                onChange: () => setActiveModal("validUntil"),
              },
            ].map((field) => (
              <div key={field.label}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {field.label}
                  </p>
                  <button
                    type="button"
                    onClick={field.onChange}
                    className="text-xs font-semibold text-accent hover:text-blue-400"
                  >
                    Change
                  </button>
                </div>
                <p className="mt-1 text-sm text-white">{field.value}</p>
                {field.secondary ? (
                  <p className="mt-0.5 text-xs text-slate-400">{field.secondary}</p>
                ) : null}
              </div>
            ))}

            <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
              {[
                ["Materials Total", formatCurrency(totals.materialsTotal)],
                ["Labour Total", formatCurrency(totals.labourTotal)],
                ["Subtotal", formatCurrency(totals.subtotal)],
                [`GST (${gstRate}%)`, formatCurrency(totals.gst)],
                [`PST (${pstRate}%)`, formatCurrency(totals.pst)],
                ["Discount", formatCurrency(totals.discountApplied)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 text-slate-400">
                  <span>{label}</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Grand Total
                </p>
                <p className="mt-1 text-2xl font-bold text-accent">
                  {formatCurrency(totals.grandTotal)}
                </p>
                <p className="text-xs font-semibold text-cyan-400">CAD</p>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-semibold text-white">Price Options</p>
              <div className="mt-3 space-y-2">
                {[
                  {
                    value: "detailed" as const,
                    label: "Show Detailed Materials",
                  },
                  {
                    value: "merged" as const,
                    label: "Merged Materials (Hide Details)",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                      priceMode === option.value
                        ? "border-accent/40 bg-accent/10 text-white"
                        : "border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="price-mode"
                      checked={priceMode === option.value}
                      onChange={() => setPriceMode(option.value)}
                      className="accent-blue-500"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Notes</p>
                <button
                  type="button"
                  onClick={() => setActiveModal("notes")}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
                  aria-label="Edit notes"
                >
                  <IconPencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {notes ||
                  "Scope notes from extraction will appear here after you record."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
              {[
                { label: "Call", icon: IconPhone },
                { label: "Email", icon: IconMail },
                { label: "Message", icon: IconSend },
                { label: "Notes", icon: IconPencil },
                { label: "More", icon: IconUsers },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                  >
                    <Icon className="h-3.5 w-3.5 text-cyan-400" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}

      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={() => setShowHowItWorks(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-navy p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">How it works</h2>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-300">
              <li>1. Tap the mic and describe the job naturally.</li>
              <li>2. Ema transcribes your voice and extracts materials + labour.</li>
              <li>3. Review the pre-invoice, edit items, then save or send.</li>
              <li>4. Use Continue Speaking to add more details anytime.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowHowItWorks(false)}
              className={`${touchBtnPrimary} mt-6 w-full`}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {showAddItem && (
        <AddItemModal
          onClose={() => setShowAddItem(false)}
          onAdd={handleAddItem}
        />
      )}

      {activeModal === "customer" && (
        <CustomerSelectModal
          selectedCustomerId={selectedCustomerId}
          onClose={() => setActiveModal(null)}
          onSelect={handleSelectCustomer}
        />
      )}

      {activeModal === "project" && (
        <ProjectEditModal
          projectName={projectName}
          onClose={() => setActiveModal(null)}
          onSave={(value) => {
            setProjectName(value);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === "validUntil" && (
        <ValidUntilModal
          validUntil={validUntil}
          onClose={() => setActiveModal(null)}
          onSave={(value) => {
            setValidUntil(value);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === "notes" && (
        <NotesEditModal
          notes={notes}
          onClose={() => setActiveModal(null)}
          onSave={(value) => {
            setNotes(value);
            setActiveModal(null);
          }}
        />
      )}

      {(activeModal === "sendContact" || activeModal === "sendNew") && (
        <SendQuoteModal
          mode={activeModal === "sendContact" ? "contact" : "new"}
          customerMode={customerMode}
          selectedCustomerId={selectedCustomerId}
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          isSending={isActionBusy}
          onClose={() => setActiveModal(null)}
          onModeChange={setCustomerMode}
          onSelectCustomer={setSelectedCustomerId}
          onChange={handleCustomerFieldChange}
          onSend={handleSendQuote}
        />
      )}

      {activeModal === "supplier" && (
        <SupplierSelectModal
          onClose={() => setActiveModal(null)}
          onSelect={handleSupplierShare}
        />
      )}
    </div>
  );
}

function AddItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (payload: {
    kind: AddItemKind;
    description: string;
    brand: string;
    qty: number;
    unit: string;
    unitPrice: number;
  }) => void;
}) {
  const [kind, setKind] = useState<AddItemKind>("material");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("each");
  const [unitPrice, setUnitPrice] = useState(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-navy p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Add item</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex rounded-lg border border-white/10 p-0.5 text-sm">
          {(["material", "labour"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setKind(option);
                setUnit(option === "labour" ? "hour" : "each");
              }}
              className={`flex-1 rounded-md px-3 py-2 capitalize ${
                kind === option ? "bg-accent text-white" : "text-slate-400"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={kind === "labour" ? "Labour description" : "Item description"}
            className={touchInput}
          />
          {kind === "material" && (
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Brand"
              className={touchInput}
            />
          )}
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={qty}
              onChange={(event) => setQty(parseFloat(event.target.value) || 0)}
              placeholder={kind === "labour" ? "Hours" : "Qty"}
              className={touchInput}
            />
            <input
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="Unit"
              disabled={kind === "labour"}
              className={touchInput}
            />
            <input
              type="number"
              value={unitPrice}
              onChange={(event) =>
                setUnitPrice(parseFloat(event.target.value) || 0)
              }
              placeholder={kind === "labour" ? "Rate" : "Unit price"}
              className={touchInput}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className={`${touchBtnSecondary} flex-1`}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!description.trim()}
            onClick={() =>
              onAdd({
                kind,
                description: description.trim(),
                brand: brand.trim(),
                qty,
                unit,
                unitPrice,
              })
            }
            className={`${touchBtnPrimary} flex-1`}
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}
