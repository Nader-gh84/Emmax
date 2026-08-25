"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconCheckCircle,
  IconClock,
  IconDocument,
} from "@/components/dashboard/icons";
import {
  IconProjects,
  IconSend,
} from "@/components/dashboard/workspace-icons";
import { EnterSupplierPricesModal } from "@/components/quotes/enter-supplier-prices-modal";
import {
  CreateQuoteLabourModal,
  type CreateQuoteLabourConfirmPayload,
} from "@/components/quotes/create-quote-labour-modal";
import { PreInvoiceVoiceCapture } from "@/components/quotes/pre-invoice-voice-capture";
import {
  ProjectsProcessColumn,
  newProjectWorkflowSteps,
} from "@/components/quotes/projects-process-column";
import styles from "@/components/quotes/projects-page.module.css";
import { QuotePdfPreviewModal } from "@/components/quotes/quote-pdf-preview-modal";
import { SetStartDateModal } from "@/components/quotes/set-start-date-modal";
import {
  SendQuoteModal,
  SendToSupplierModal,
} from "@/components/quotes/voice-quote-action-modals";
import {
  applySupplierPricesToQuote,
  prepareCustomerQuote,
  quoteToActionState,
  saveCreateQuoteLabour,
} from "@/lib/pre-invoice-actions";
import { deletePreInvoiceByQuoteId } from "@/lib/delete-pre-invoice";
import {
  PRE_INVOICE_WORKFLOW_STEPS,
  buildPreInvoiceStats,
  mapQuoteToPreInvoiceCard,
  type PreInvoiceProjectCard,
  type WorkflowStepId,
} from "@/lib/pre-invoices";
import {
  saveQuoteDraft,
  sendMaterialsToSupplier,
  sendQuoteEmailAndPersist,
  type QuoteActionState,
} from "@/lib/quote-actions";
import { createClient } from "@/lib/supabase";
import type { MaterialOrder } from "@/types/material-order";
import type { Project } from "@/types/project";
import type { Quote } from "@/types/quote";
import type { Supplier } from "@/types/supplier";
import type { CustomerSelectionMode } from "@/lib/quotes";

type ActiveModal =
  | null
  | { kind: "supplier"; quoteId: string }
  | { kind: "upload_prices"; quoteId: string }
  | { kind: "create_quote_labour"; quoteId: string }
  | { kind: "send_customer"; quoteId: string }
  | { kind: "pdf_preview"; quoteId: string; pdfPath: string }
  | { kind: "start_date"; projectId: string };

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.25l2.955 5.986 6.605.96-4.78 4.66 1.128 6.579L12 17.27l-5.908 3.165 1.128-6.579-4.78-4.66 6.605-.96L12 2.25z" />
    </svg>
  );
}

function IconStarOutline({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}
function IconCart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function statIcon(id: string, className = "h-5 w-5") {
  switch (id) {
    case "all":
      return <IconProjects className={className} />;
    case "waiting":
      return <IconClock className={className} />;
    case "sent":
      return <IconSend className={className} />;
    case "accepted":
      return <IconCheckCircle className={className} />;
    case "ready_order":
      return <IconCart className={className} />;
    case "ready_start":
      return <IconPlay className={className} />;
    default:
      return <IconDocument className={className} />;
  }
}
function ProjectCard({
  project,
  busy,
  selected,
  onSelect,
  onEdit,
  onViewPdf,
  onDelete,
}: {
  project: PreInvoiceProjectCard;
  busy: boolean;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onViewPdf: () => void;
  onDelete: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <article
      className={`${styles.card} ${styles.pCard} ${
        selected ? styles.pCardSelected : ""
      }`}
      onClick={onSelect}
    >
      <div className={styles.pCardTop}>
        <div className={styles.pCardMeta}>
          <span className={styles.pNum}>{project.projectNumber}</span>
          <div className={styles.pTitleRow}>
            <h3>{project.title}</h3>
            <button
              type="button"
              className={styles.iconBtn}
              style={{
                color: project.favorited ? "#fbbf24" : undefined,
                width: 28,
                height: 28,
              }}
              aria-label={project.favorited ? "Unfavorite" : "Favorite"}
              onClick={(event) => event.stopPropagation()}
            >
              {project.favorited ? (
                <IconStar className="h-4 w-4" />
              ) : (
                <IconStarOutline className="h-4 w-4" />
              )}
            </button>
            <span
              className={
                project.statusTone === "accepted" || project.statusTone === "ready"
                  ? `${styles.tag} ${styles.tagDone}`
                  : project.statusTone === "start" || project.statusTone === "sent"
                    ? `${styles.tag} ${styles.tagActive}`
                    : styles.tag
              }
            >
              {project.statusLabel}
            </span>
          </div>
          <p className={styles.pCustomer}>{project.customerName}</p>
          <p className={styles.pAddress}>{project.address}</p>
          <p className={styles.pPrice}>{project.priceLabel}</p>
          <div className={styles.pFacts}>
            <span>{project.materialsCount} materials</span>
            <span>{project.createdLabel}</span>
          </div>
          <div className={styles.pFacts}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setDetailsOpen((open) => !open);
              }}
              className={styles.howItWorks}
            >
              {detailsOpen ? "Hide details" : "View details"}
            </button>
            {project.pdfPath ? (
              <button
                type="button"
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation();
                  onViewPdf();
                }}
                className={styles.toolBtn}
              >
                View PDF
              </button>
            ) : null}
          </div>
          {detailsOpen ? (
            <p className={styles.nextAction} style={{ marginTop: 8 }}>
              Quote ID: {project.quoteId || "—"}
              {project.projectId ? ` · Project ID: ${project.projectId}` : ""}
            </p>
          ) : null}
        </div>

        <div className={styles.pMore}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setMoreOpen((open) => !open);
            }}
            disabled={busy}
            className={styles.toolBtn}
          >
            More
          </button>
          {moreOpen ? (
            <div className={styles.menu}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setMoreOpen(false);
                  onEdit();
                }}
              >
                Edit
              </button>
              {project.pdfPath ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMoreOpen(false);
                    onViewPdf();
                  }}
                >
                  View PDF
                </button>
              ) : null}
              <button
                type="button"
                className={styles.menuDanger}
                onClick={(event) => {
                  event.stopPropagation();
                  setMoreOpen(false);
                  onDelete();
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.cardSteps} aria-hidden="true">
        {project.steps.map((step, index) => (
          <span
            key={step.id}
            className={`${styles.miniStep} ${
              step.state === "completed"
                ? styles.miniDone
                : step.state === "active"
                  ? styles.miniActive
                  : ""
            }`}
            title={PRE_INVOICE_WORKFLOW_STEPS[index]?.title}
          >
            {index + 1}
          </span>
        ))}
      </div>

      <p className={styles.nextAction}>{project.nextActionText}</p>
    </article>
  );
}

export function PreInvoicesDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const voiceSectionRef = useRef<HTMLDivElement | null>(null);
  const [cards, setCards] = useState<PreInvoiceProjectCard[]>([]);
  const [quotesById, setQuotesById] = useState<Record<string, Quote>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [sendState, setSendState] = useState<QuoteActionState | null>(null);
  const [customerMode, setCustomerMode] =
    useState<CustomerSelectionMode>("existing");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [captureProjectName, setCaptureProjectName] = useState("");

  const loadCards = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCards([]);
      setQuotesById({});
      setIsLoading(false);
      return;
    }

    const [{ data: quotes, error: quotesError }, { data: projects }, { data: orders }] =
      await Promise.all([
        supabase
          .from("quotes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("projects").select("*").eq("user_id", user.id),
        supabase
          .from("material_orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    if (quotesError) {
      setError("Failed to load projects. Please try again.");
      setIsLoading(false);
      return;
    }

    const projectByQuoteId = new Map<string, Project>();
    for (const project of (projects as Project[]) ?? []) {
      if (project.quote_id) projectByQuoteId.set(project.quote_id, project);
    }

    const orderByProjectId = new Map<string, MaterialOrder>();
    for (const order of (orders as MaterialOrder[]) ?? []) {
      if (order.project_id && !orderByProjectId.has(order.project_id)) {
        orderByProjectId.set(order.project_id, order);
      }
    }

    const quoteMap: Record<string, Quote> = {};
    const nextCards = ((quotes as Quote[]) ?? [])
      .filter((quote) => {
        const linkedProject = projectByQuoteId.get(quote.id) ?? null;
        // Started projects leave this pipeline list — they live under Customer → Projects.
        if (linkedProject?.status === "in_progress") {
          return false;
        }

        const hasMaterials =
          Array.isArray(quote.materials) && quote.materials.length > 0;
        const hasProject = Boolean(linkedProject);
        const sentSupplier = Boolean(quote.supplier_ack_token);
        return (
          hasMaterials || hasProject || sentSupplier || quote.status !== "draft"
        );
      })
      .map((quote) => {
        quoteMap[quote.id] = quote;
        const project = projectByQuoteId.get(quote.id) ?? null;
        const latestOrder = project?.id
          ? orderByProjectId.get(project.id) ?? null
          : null;
        return mapQuoteToPreInvoiceCard(quote, project, latestOrder);
      });

    setQuotesById(quoteMap);
    setCards(nextCards);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  useEffect(() => {
    const fromUrl = searchParams.get("quote") || searchParams.get("quoteId");
    if (fromUrl) setSelectedQuoteId(fromUrl);
  }, [searchParams]);

  const stats = useMemo(() => buildPreInvoiceStats(cards), [cards]);

  const selectedCard =
    cards.find((card) => card.quoteId === selectedQuoteId) ??
    cards.find((card) => card.id === selectedQuoteId) ??
    null;

  useEffect(() => {
    if (isLoading) return;
    if (
      selectedQuoteId &&
      !cards.some(
        (card) => card.quoteId === selectedQuoteId || card.id === selectedQuoteId
      )
    ) {
      setSelectedQuoteId(null);
    }
  }, [cards, isLoading, selectedQuoteId]);

  const processTitle = selectedCard
    ? selectedCard.title
    : captureProjectName.trim() || "New project";
  const processSteps = selectedCard
    ? selectedCard.steps
    : newProjectWorkflowSteps();

  const modalQuote =
    activeModal && "quoteId" in activeModal
      ? quotesById[activeModal.quoteId] ?? null
      : null;

  const modalMaterials = useMemo(() => {
    if (!modalQuote) return [];
    return quoteToActionState(modalQuote).materials;
  }, [modalQuote]);

  function showFeedback(
    type: "success" | "error" | "info",
    message: string
  ) {
    setFeedback({ type, message });
  }

  async function refreshAfterAction(message: string) {
    showFeedback("success", message);
    setIsLoading(true);
    await loadCards();
  }

  async function handleStepAction(
    card: PreInvoiceProjectCard,
    stepId: WorkflowStepId
  ) {
    if (actionBusy) return;
    setFeedback(null);

    const quote = card.quoteId ? quotesById[card.quoteId] : null;

    switch (stepId) {
      case "voice_materials": {
        voiceSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        showFeedback(
          "info",
          "Use the recorder to extract or add materials for this project."
        );
        break;
      }
      case "send_supplier": {
        if (!quote) {
          showFeedback("error", "Quote not found for this card.");
          return;
        }
        setActiveModal({ kind: "supplier", quoteId: quote.id });
        break;
      }
      case "upload_prices": {
        if (!quote) {
          showFeedback("error", "Quote not found for this card.");
          return;
        }
        setActiveModal({ kind: "upload_prices", quoteId: quote.id });
        break;
      }
      case "create_quote": {
        if (!quote) {
          showFeedback("error", "Quote not found for this card.");
          return;
        }
        setActiveModal({ kind: "create_quote_labour", quoteId: quote.id });
        break;
      }
      case "send_customer":
      case "customer_accept": {
        if (!quote) {
          showFeedback("error", "Quote not found for this card.");
          return;
        }
        openSendCustomerForQuote(quote);
        break;
      }
      case "order_materials": {
        if (!card.projectId) {
          showFeedback(
            "error",
            "No project linked yet. Save/send the quote first so a project exists."
          );
          return;
        }
        if (!card.customerId) {
          showFeedback(
            "error",
            "Assign a customer before ordering materials (Send Quote to a customer first)."
          );
          return;
        }
        router.push(
          `/dashboard/customers/${card.customerId}/projects/${card.projectId}/order-materials`
        );
        break;
      }
      case "materials_ready": {
        if (!card.materialOrderId) {
          showFeedback("error", "No material order found for this project.");
          return;
        }
        if (!card.orderConfirmed) {
          showFeedback(
            "info",
            "Waiting for the supplier to confirm availability via their email link."
          );
          return;
        }
        setActionBusy(true);
        try {
          const response = await fetch(
            `/api/material-orders/${card.materialOrderId}/mark-received`,
            { method: "POST" }
          );
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(
              (data as { error?: string }).error ||
                "Failed to mark materials received"
            );
          }
          await refreshAfterAction(
            "Materials marked received. Step 8 complete — set a start date next."
          );
        } catch (err) {
          showFeedback(
            "error",
            err instanceof Error ? err.message : "Failed to mark materials received"
          );
        } finally {
          setActionBusy(false);
        }
        break;
      }
      case "schedule_project": {
        if (!card.projectId) {
          showFeedback("error", "No project found to schedule.");
          return;
        }
        setActiveModal({ kind: "start_date", projectId: card.projectId });
        break;
      }
      case "start_project": {
        if (!card.projectId) {
          showFeedback("error", "No project found to start.");
          return;
        }
        setActionBusy(true);
        try {
          const response = await fetch(
            `/api/projects/${card.projectId}/start`,
            { method: "POST" }
          );
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            const supabaseDetail =
              typeof (data as { supabase?: { message?: string } })?.supabase
                ?.message === "string"
                ? ` (${(data as { supabase: { message: string; code?: string } }).supabase.message}${
                    (data as { supabase: { code?: string } }).supabase.code
                      ? ` · ${(data as { supabase: { code?: string } }).supabase.code}`
                      : ""
                  })`
                : "";
            throw new Error(
              `${(data as { error?: string }).error || "Failed to start project"}${supabaseDetail}`
            );
          }

          // Leave the pre-start pipeline immediately; record stays under Customer → Projects.
          setCards((current) => current.filter((item) => item.id !== card.id));
          if (card.quoteId) {
            setQuotesById((current) => {
              const next = { ...current };
              delete next[card.quoteId as string];
              return next;
            });
          }

          await refreshAfterAction(
            "Project started. It now appears under the customer's Projects tab."
          );
        } catch (err) {
          showFeedback(
            "error",
            err instanceof Error ? err.message : "Failed to start project"
          );
        } finally {
          setActionBusy(false);
        }
        break;
      }
      default:
        break;
    }
  }

  async function handleSendToSupplier(payload: {
    supplier: Supplier;
    supplierEmail: string;
    messageBody: string;
  }) {
    if (!modalQuote) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      await sendMaterialsToSupplier(quoteToActionState(modalQuote), {
        supplierName: payload.supplier.supplier_name,
        supplierEmail: payload.supplierEmail,
        messageBody: payload.messageBody,
      });
      setActiveModal(null);
      await refreshAfterAction(
        `Pricing request sent to ${payload.supplier.supplier_name}. Step 2 complete.`
      );
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Failed to send to supplier"
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSavePrices(payload: {
    updates: { materialId: string; unitCost: number }[];
    file: File | null;
    removeExistingFile: boolean;
  }) {
    if (!modalQuote) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      await applySupplierPricesToQuote(
        modalQuote,
        modalMaterials,
        payload.updates,
        {
          file: payload.file,
          removeExistingFile: payload.removeExistingFile,
        }
      );
      setActiveModal(null);
      await refreshAfterAction(
        "Supplier prices confirmed for every line. Step 3 complete — create the customer quote next."
      );
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Failed to save prices"
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleConfirmCreateQuoteLabour(
    payload: CreateQuoteLabourConfirmPayload
  ) {
    if (!modalQuote) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      const supabase = createClient();
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .order("full_name", { ascending: true });

      if (employeesError) {
        throw new Error("Failed to load employees for labour cost.");
      }

      const { quote: updatedQuote } = await saveCreateQuoteLabour({
        quote: modalQuote,
        employees: employees ?? [],
        hoursByEmployeeId: payload.hoursByEmployeeId,
        billingMode: payload.billingMode,
        sellHourlyRate: payload.sellHourlyRate,
        sellFlatAmount: payload.sellFlatAmount,
      });

      const result = await prepareCustomerQuote(updatedQuote);
      await refreshAfterAction(
        "Labour saved and quote PDF created. Preview ready — send, save draft, or download."
      );
      setActiveModal({
        kind: "pdf_preview",
        quoteId: result.quoteId,
        pdfPath: result.pdfPath,
      });
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Failed to create quote"
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSendQuote() {
    if (!sendState) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      await sendQuoteEmailAndPersist({
        ...sendState,
        customerMode,
      });
      setActiveModal(null);
      setSendState(null);
      await refreshAfterAction(
        `Quote sent to ${sendState.customerEmail.trim()}. Waiting for customer accept.`
      );
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Failed to send quote"
      );
    } finally {
      setActionBusy(false);
    }
  }

  function openSendCustomerForQuote(quote: Quote) {
    const state = quoteToActionState(quote);
    setSendState(state);
    setCustomerMode(state.selectedCustomerId ? "existing" : "new");
    setActiveModal({ kind: "send_customer", quoteId: quote.id });
  }

  async function handlePreviewSaveDraft() {
    if (!modalQuote) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      await saveQuoteDraft(quoteToActionState(modalQuote));
      setActiveModal(null);
      await refreshAfterAction(
        "Quote saved as draft. Open View PDF anytime to send or download."
      );
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Failed to save draft"
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteCard(card: PreInvoiceProjectCard) {
    if (!card.quoteId) {
      showFeedback("error", "This card has no quote to delete.");
      return;
    }
    if (actionBusy) return;

    const label = card.projectNumber || card.title || "this project";
    const confirmed = window.confirm(
      `Are you sure you want to delete ${label}? This cannot be undone.`
    );
    if (!confirmed) return;

    const quoteId = card.quoteId;
    const previousCards = cards;
    const previousQuotes = quotesById;

    // Optimistic UI — stats recompute from cards via useMemo.
    setCards((current) => current.filter((item) => item.id !== card.id));
    setQuotesById((current) => {
      const next = { ...current };
      delete next[quoteId];
      return next;
    });
    if (activeModal && "quoteId" in activeModal && activeModal.quoteId === quoteId) {
      setActiveModal(null);
      setSendState(null);
    }

    setActionBusy(true);
    setFeedback(null);
    try {
      await deletePreInvoiceByQuoteId(quoteId);
      showFeedback("success", `${label} deleted.`);
    } catch (err) {
      setCards(previousCards);
      setQuotesById(previousQuotes);
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Failed to delete project"
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveStartDate(startDate: string) {
    if (!activeModal || activeModal.kind !== "start_date") return;
    setActionBusy(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/projects/${activeModal.projectId}/start-date`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (data as { error?: string }).error || "Failed to save start date"
        );
      }
      setActiveModal(null);
      await refreshAfterAction(
        "Start date saved. Step 9 complete — you can start the project."
      );
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Failed to save start date"
      );
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          <h1>Projects</h1>
          <p>
            Create quotes, get supplier prices, send quotes, order materials and start
            projects.
          </p>
        </div>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.btnNew}
            onClick={() => {
              setSelectedQuoteId(null);
              voiceSectionRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          >
            <svg viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2.5v11M2.5 8h11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            New Project
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div ref={voiceSectionRef}>
          <PreInvoiceVoiceCapture
            onProjectNameChange={setCaptureProjectName}
            onProjectCreated={(quoteId) => {
              setIsLoading(true);
              if (quoteId) {
                setSelectedQuoteId(quoteId);
              }
              void loadCards();
            }}
          />
        </div>
        <ProjectsProcessColumn
          projectTitle={processTitle}
          steps={processSteps}
          busy={actionBusy}
          interactive={Boolean(selectedCard)}
          onStepAction={(stepId) => {
            if (!selectedCard) return;
            void handleStepAction(selectedCard, stepId);
          }}
        />
      </div>

      {(feedback || error) && (
        <div
          className={`${styles.banner} ${
            error || feedback?.type === "error"
              ? styles.bannerError
              : feedback?.type === "success"
                ? styles.bannerSuccess
                : styles.bannerInfo
          }`}
          style={{ marginTop: 22 }}
        >
          {error || feedback?.message}
        </div>
      )}

      <section className={styles.listSection}>
        <div className={styles.listHead}>
          <h2>In progress &amp; completed</h2>
          <p>Select a card to see its 10-step process on the right.</p>
        </div>

        <div className={styles.stats}>
          {stats.map((stat) => (
            <div key={stat.id} className={`${styles.card} ${styles.stat}`}>
              <span className={styles.statIcon}>{statIcon(stat.id, "h-4 w-4")}</span>
              <strong>{stat.count}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.cards}>
          {isLoading ? (
            <div className={`${styles.card} ${styles.loading}`}>
              <span className={styles.spinner} />
              Loading projects…
            </div>
          ) : cards.length === 0 ? (
            <div className={`${styles.card} ${styles.emptyState}`}>
              <h2>No projects yet</h2>
              <p>
                Record materials above to start a project in this pipeline. After Start
                Project, it moves to the customer&apos;s Projects tab.
              </p>
            </div>
          ) : (
            cards.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                busy={actionBusy}
                selected={
                  selectedQuoteId === project.quoteId ||
                  selectedQuoteId === project.id
                }
                onSelect={() =>
                  setSelectedQuoteId(project.quoteId || project.id)
                }
                onEdit={() => {
                  if (!project.quoteId) return;
                  router.push(
                    `/dashboard/voice-quote-builder?quote=${project.quoteId}`
                  );
                }}
                onViewPdf={() => {
                  if (!project.quoteId || !project.pdfPath) {
                    showFeedback(
                      "error",
                      "No quote PDF found yet. Create Quote first."
                    );
                    return;
                  }
                  setActiveModal({
                    kind: "pdf_preview",
                    quoteId: project.quoteId,
                    pdfPath: project.pdfPath,
                  });
                }}
                onDelete={() => void handleDeleteCard(project)}
              />
            ))
          )}
        </div>
      </section>

      {activeModal?.kind === "supplier" && modalQuote ? (
        <SendToSupplierModal
          materials={modalMaterials.map(({ item, brand, quantity, unit }) => ({
            item,
            brand,
            quantity,
            unit,
          }))}
          isSending={actionBusy}
          onClose={() => setActiveModal(null)}
          onSend={handleSendToSupplier}
        />
      ) : null}

      {activeModal?.kind === "upload_prices" && modalQuote ? (
        <EnterSupplierPricesModal
          materials={modalMaterials}
          existingFilePath={modalQuote.supplier_pricing_file_path}
          pricesAlreadyConfirmed={Boolean(
            modalQuote.supplier_pricing_uploaded_at
          )}
          isSaving={actionBusy}
          onClose={() => setActiveModal(null)}
          onSave={handleSavePrices}
        />
      ) : null}

      {activeModal?.kind === "create_quote_labour" && modalQuote ? (
        <CreateQuoteLabourModal
          quote={modalQuote}
          isSaving={actionBusy}
          onClose={() => setActiveModal(null)}
          onConfirm={handleConfirmCreateQuoteLabour}
        />
      ) : null}

      {activeModal?.kind === "pdf_preview" && modalQuote ? (
        <QuotePdfPreviewModal
          title={
            modalQuote.project_name?.trim() ||
            modalQuote.quote_number?.trim() ||
            "Quote PDF"
          }
          quoteNumber={modalQuote.quote_number}
          pdfPath={activeModal.pdfPath || modalQuote.pdf_url || ""}
          pdfFileName={`${modalQuote.quote_number || modalQuote.id}.pdf`}
          busy={actionBusy}
          onClose={() => setActiveModal(null)}
          onSendToCustomer={() => openSendCustomerForQuote(modalQuote)}
          onSaveToDraft={handlePreviewSaveDraft}
        />
      ) : null}

      {activeModal?.kind === "send_customer" && sendState ? (
        <SendQuoteModal
          mode={customerMode === "existing" ? "contact" : "new"}
          customerMode={customerMode}
          selectedCustomerId={sendState.selectedCustomerId}
          customerName={sendState.customerName}
          customerEmail={sendState.customerEmail}
          customerPhone={sendState.customerPhone}
          isSending={actionBusy}
          onClose={() => {
            setActiveModal(null);
            setSendState(null);
          }}
          onModeChange={setCustomerMode}
          onSelectCustomer={(customerId) =>
            setSendState((current) =>
              current ? { ...current, selectedCustomerId: customerId } : current
            )
          }
          onChange={(field, value) =>
            setSendState((current) =>
              current ? { ...current, [field]: value } : current
            )
          }
          onSend={handleSendQuote}
        />
      ) : null}

      {activeModal?.kind === "start_date" ? (
        <SetStartDateModal
          isSaving={actionBusy}
          onClose={() => setActiveModal(null)}
          onSave={handleSaveStartDate}
        />
      ) : null}
    </main>
  );
}
