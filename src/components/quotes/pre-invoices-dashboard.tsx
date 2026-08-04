"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconDocument,
  IconMicrophone,
  IconTruck,
} from "@/components/dashboard/icons";
import {
  IconLocation,
  IconProjects,
  IconSend,
} from "@/components/dashboard/workspace-icons";
import { EnterSupplierPricesModal } from "@/components/quotes/enter-supplier-prices-modal";
import { PreInvoiceVoiceCapture } from "@/components/quotes/pre-invoice-voice-capture";
import { SetStartDateModal } from "@/components/quotes/set-start-date-modal";
import {
  SendQuoteModal,
  SendToSupplierModal,
} from "@/components/quotes/voice-quote-action-modals";
import { touchBtnSecondary } from "@/components/quotes/ui";
import {
  applySupplierPricesToQuote,
  prepareCustomerQuote,
  quoteToActionState,
} from "@/lib/pre-invoice-actions";
import {
  PRE_INVOICE_WORKFLOW_STEPS,
  buildPreInvoiceStats,
  mapQuoteToPreInvoiceCard,
  type PreInvoiceProjectCard,
  type ProjectStatusTone,
  type ProjectWorkflowStep,
  type WorkflowStepDefinition,
  type WorkflowStepId,
} from "@/lib/pre-invoices";
import {
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
  | { kind: "send_customer"; quoteId: string }
  | { kind: "start_date"; projectId: string };

function IconInfo({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

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

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function stepIcon(id: WorkflowStepId, className = "h-4 w-4") {
  switch (id) {
    case "voice_materials":
      return <IconMicrophone className={className} />;
    case "send_supplier":
      return <IconTruck className={className} />;
    case "upload_prices":
      return <IconUpload className={className} />;
    case "create_quote":
      return <IconDocument className={className} />;
    case "send_customer":
      return <IconSend className={className} />;
    case "customer_accept":
      return <IconCheckCircle className={className} />;
    case "order_materials":
      return <IconCart className={className} />;
    case "materials_ready":
      return <IconProjects className={className} />;
    case "schedule_project":
      return <IconCalendar className={className} />;
    case "start_project":
      return <IconPlay className={className} />;
    default:
      return <IconDocument className={className} />;
  }
}

function statusBadgeClasses(tone: ProjectStatusTone): string {
  switch (tone) {
    case "waiting":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "sent":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "accepted":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "ready":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
    case "start":
      return "border-accent/30 bg-accent/10 text-accent";
    default:
      return "border-white/15 bg-white/5 text-slate-300";
  }
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

function WorkflowGuideSteps() {
  return (
    <div className="mt-6 overflow-x-auto pb-2">
      <ol className="flex min-w-max items-start gap-0 px-1">
        {PRE_INVOICE_WORKFLOW_STEPS.map((step, index) => (
          <li key={step.id} className="flex items-start">
            <div className="flex w-[7.5rem] flex-col items-center px-1 text-center sm:w-32">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-accent ring-1 ring-white/5">
                {stepIcon(step.id, "h-5 w-5")}
              </span>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Step {step.number}
              </span>
              <span className="mt-1 text-xs font-semibold text-white">
                {step.title}
              </span>
              <span className="mt-1 text-[11px] leading-snug text-slate-400">
                {step.description}
              </span>
            </div>
            {index < PRE_INVOICE_WORKFLOW_STEPS.length - 1 ? (
              <div
                className="mt-5 h-px w-4 shrink-0 border-t border-dashed border-white/20 sm:w-6"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ProjectStepNode({
  definition,
  step,
  busy,
  onAction,
}: {
  definition: WorkflowStepDefinition;
  step: ProjectWorkflowStep;
  busy: boolean;
  onAction: () => void;
}) {
  const clickable = step.state === "active" || step.state === "completed";

  return (
    <div className="flex items-start">
      <div className="flex w-[4.75rem] flex-col items-center px-0.5 text-center sm:w-[5.5rem]">
        <button
          type="button"
          disabled={!clickable || busy || step.state === "locked"}
          onClick={() => {
            if (step.state === "active") onAction();
          }}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
            step.state === "completed"
              ? "cursor-default border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              : step.state === "active"
                ? "cursor-pointer border-accent/50 bg-accent/20 text-accent shadow-md shadow-accent/20 hover:bg-accent/30 disabled:opacity-50"
                : "cursor-default border-white/10 bg-white/[0.03] text-slate-500"
          }`}
          aria-label={`${definition.title} (${step.state})`}
        >
          {step.state === "completed" ? (
            <IconCheckCircle className="h-4 w-4" />
          ) : step.state === "locked" ? (
            <IconLock className="h-3.5 w-3.5" />
          ) : (
            stepIcon(definition.id, "h-4 w-4")
          )}
        </button>
        <span
          className={`mt-1.5 text-[10px] font-medium leading-tight ${
            step.state === "locked" ? "text-slate-600" : "text-slate-300"
          }`}
        >
          {definition.title}
        </span>
        {step.state === "completed" && step.completedDate ? (
          <span className="mt-0.5 text-[10px] text-emerald-400/80">
            {step.completedDate}
          </span>
        ) : null}
        {step.state === "active" && step.actionLabel ? (
          <button
            type="button"
            disabled={busy}
            onClick={onAction}
            className="mt-1.5 inline-flex min-h-[28px] items-center justify-center rounded-lg bg-accent px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
          >
            {step.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  busy,
  onStepAction,
  onEdit,
}: {
  project: PreInvoiceProjectCard;
  busy: boolean;
  onStepAction: (stepId: WorkflowStepId) => void;
  onEdit: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-stretch xl:gap-6">
        <div className="min-w-0 flex-1 xl:max-w-sm xl:shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-300">
                {project.projectNumber}
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-white">{project.title}</h3>
                <button
                  type="button"
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-white/10 ${
                    project.favorited ? "text-amber-300" : "text-slate-500"
                  }`}
                  aria-label={project.favorited ? "Unfavorite" : "Favorite"}
                >
                  {project.favorited ? (
                    <IconStar className="h-4 w-4" />
                  ) : (
                    <IconStarOutline className="h-4 w-4" />
                  )}
                </button>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${statusBadgeClasses(
                    project.statusTone
                  )}`}
                >
                  {project.statusLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{project.customerName}</p>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-400">
                <IconLocation className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <span>{project.address}</span>
              </p>
              <p className="mt-3 text-2xl font-bold text-accent">{project.priceLabel}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>{project.materialsCount} materials</span>
                <span className="inline-flex items-center gap-1">
                  <IconCalendar className="h-3.5 w-3.5" />
                  {project.createdLabel}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent transition hover:text-blue-400"
              >
                View Details
                <IconChevronDown
                  className={`h-4 w-4 transition ${detailsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {detailsOpen ? (
                <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-slate-400">
                  Quote ID: {project.quoteId || "—"}
                  {project.projectId ? ` · Project ID: ${project.projectId}` : ""}
                </p>
              ) : null}
            </div>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className={`${touchBtnSecondary} min-h-[36px] gap-1.5 px-3 text-sm`}
              >
                More
                <IconChevronDown
                  className={`h-3.5 w-3.5 transition ${moreOpen ? "rotate-180" : ""}`}
                />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onEdit();
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    Edit
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 border-t border-white/10 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max items-start">
              {PRE_INVOICE_WORKFLOW_STEPS.map((definition, index) => {
                const step = project.steps[index];
                const showConnector =
                  index < PRE_INVOICE_WORKFLOW_STEPS.length - 1 &&
                  definition.number !== 9;
                return (
                  <div key={definition.id} className="flex items-start">
                    {definition.number === 10 ? (
                      <div className="mx-1 mt-2 h-10 w-px shrink-0 bg-white/20 sm:mx-2" aria-hidden="true" />
                    ) : null}
                    <ProjectStepNode
                      definition={definition}
                      step={step}
                      busy={busy}
                      onAction={() => onStepAction(definition.id)}
                    />
                    {showConnector ? (
                      <div
                        className={`mt-4 h-px w-3 shrink-0 border-t border-dashed sm:w-4 ${
                          step.state === "completed"
                            ? "border-emerald-500/40"
                            : "border-white/15"
                        }`}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
              {project.nextActionText}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PreInvoicesDashboard() {
  const router = useRouter();
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
      setError("Failed to load pre-invoices. Please try again.");
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
        const hasMaterials =
          Array.isArray(quote.materials) && quote.materials.length > 0;
        const hasProject = Boolean(quote.id && projectByQuoteId.has(quote.id));
        const sentSupplier = Boolean(quote.supplier_ack_token);
        return hasMaterials || hasProject || sentSupplier || quote.status !== "draft";
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

  const stats = useMemo(() => buildPreInvoiceStats(cards), [cards]);

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
          "Use Record Your Voice above to extract or add materials."
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
        setActionBusy(true);
        try {
          await prepareCustomerQuote(quote);
          setActiveModal(null);
          await refreshAfterAction(
            "Quote PDF created. Step 4 complete — ready to send to customer."
          );
        } catch (err) {
          showFeedback(
            "error",
            err instanceof Error ? err.message : "Failed to create quote"
          );
        } finally {
          setActionBusy(false);
        }
        break;
      }
      case "send_customer":
      case "customer_accept": {
        if (!quote) {
          showFeedback("error", "Quote not found for this card.");
          return;
        }
        const state = quoteToActionState(quote);
        setSendState(state);
        setCustomerMode(state.selectedCustomerId ? "existing" : "new");
        setActiveModal({ kind: "send_customer", quoteId: quote.id });
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
            throw new Error(
              (data as { error?: string }).error || "Failed to start project"
            );
          }
          await refreshAfterAction("Project started. Workflow complete.");
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

  async function handleSavePrices(
    updates: { materialId: string; unitPrice: number }[]
  ) {
    if (!modalQuote) return;
    setActionBusy(true);
    setFeedback(null);
    try {
      await applySupplierPricesToQuote(modalQuote, modalMaterials, updates);
      setActiveModal(null);
      await refreshAfterAction(
        "Supplier prices saved. Step 3 complete — create the customer quote next."
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
    <main className="relative min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl pb-28">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pre-Invoices
            </h1>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400">
              <IconInfo className="h-5 w-5" />
            </span>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Create pre-invoices with voice, get supplier prices, send quotes to
            customers, order materials and start projects - all in one place.
          </p>
        </header>

        <div className="mt-6" ref={voiceSectionRef}>
          <PreInvoiceVoiceCapture
            onProjectCreated={() => {
              setIsLoading(true);
              void loadCards();
            }}
          />
        </div>

        {(feedback || error) && (
          <div
            className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
              error || feedback?.type === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : feedback?.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}
          >
            {error || feedback?.message}
          </div>
        )}

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
                {statIcon(stat.id)}
              </span>
              <p className="mt-3 text-2xl font-bold text-white">{stat.count}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 sm:px-6">
          <h2 className="text-lg font-semibold text-white">Pre-Invoice Workflow</h2>
          <p className="mt-1 text-sm text-slate-400">
            Each step unlocks when the previous step is completed.
          </p>
          <WorkflowGuideSteps />
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500 sm:text-sm">
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            Click on any active step button to continue the workflow
          </p>
        </section>

        <section className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-sm text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
              Loading pre-invoices…
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-14 text-center">
              <h2 className="text-lg font-semibold text-white">No pre-invoices yet</h2>
              <p className="mt-2 text-sm text-slate-400">
                Record materials above and send them to a supplier to create your
                first pre-invoice card.
              </p>
            </div>
          ) : (
            cards.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                busy={actionBusy}
                onStepAction={(stepId) => void handleStepAction(project, stepId)}
                onEdit={() => {
                  if (!project.quoteId) return;
                  router.push(
                    `/dashboard/voice-quote-builder?quote=${project.quoteId}`
                  );
                }}
              />
            ))
          )}
        </section>

        <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white">How it works</h2>
            <p className="mt-1 text-sm text-slate-400">
              Follow the workflow steps from left to right. Each step will unlock
              when the previous step is completed.
            </p>
          </div>
        </section>
      </div>

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
          isSaving={actionBusy}
          onClose={() => setActiveModal(null)}
          onSave={handleSavePrices}
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
