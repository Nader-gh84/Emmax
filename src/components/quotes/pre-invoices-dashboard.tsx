"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { PreInvoiceVoiceCapture } from "@/components/quotes/pre-invoice-voice-capture";
import { touchBtnSecondary } from "@/components/quotes/ui";
import { createClient } from "@/lib/supabase";
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
import type { MaterialOrder } from "@/types/material-order";
import type { Project } from "@/types/project";
import type { Quote } from "@/types/quote";

function noop(label: string) {
  return () => {
    console.log(`[Pre-Invoices UI] ${label}`);
  };
}

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
  projectId,
  showDividerBefore,
}: {
  definition: WorkflowStepDefinition;
  step: ProjectWorkflowStep;
  projectId: string;
  showDividerBefore?: boolean;
}) {
  return (
    <div className="flex items-start">
      {showDividerBefore ? (
        <div className="mx-1 mt-2 h-10 w-px shrink-0 bg-white/20 sm:mx-2" aria-hidden="true" />
      ) : null}
      <div className="flex w-[4.75rem] flex-col items-center px-0.5 text-center sm:w-[5.5rem]">
        <button
          type="button"
          onClick={noop(`Step ${definition.number} · ${projectId}`)}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
            step.state === "completed"
              ? "cursor-pointer border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              : step.state === "active"
                ? "cursor-pointer border-accent/50 bg-accent/20 text-accent shadow-md shadow-accent/20 hover:bg-accent/30"
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
            onClick={noop(`${step.actionLabel} · ${projectId}`)}
            className="mt-1.5 inline-flex min-h-[28px] items-center justify-center rounded-lg bg-accent px-2 py-1 text-[10px] font-semibold text-white transition hover:bg-blue-600"
          >
            {step.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: PreInvoiceProjectCard }) {
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
                  onClick={noop(`Favorite ${project.id}`)}
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
                onClick={() => {
                  setDetailsOpen((open) => !open);
                  noop(`View Details ${project.id}`)();
                }}
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
                  {["Edit", "Duplicate", "Delete"].map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        noop(`${action} ${project.id}`)();
                      }}
                      className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white/5 ${
                        action === "Delete"
                          ? "text-red-300 hover:text-red-200"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {action}
                    </button>
                  ))}
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
                    <ProjectStepNode
                      definition={definition}
                      step={step}
                      projectId={project.id}
                      showDividerBefore={definition.number === 10}
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
  const [cards, setCards] = useState<PreInvoiceProjectCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setCards([]);
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

    const nextCards = ((quotes as Quote[]) ?? [])
      .filter((quote) => {
        // Show quotes that have materials (real pre-invoice work) or any
        // linked project / supplier send activity.
        const hasMaterials =
          Array.isArray(quote.materials) && quote.materials.length > 0;
        const hasProject = Boolean(quote.id && projectByQuoteId.has(quote.id));
        const sentSupplier = Boolean(quote.supplier_ack_token);
        return hasMaterials || hasProject || sentSupplier || quote.status !== "draft";
      })
      .map((quote) => {
        const project = projectByQuoteId.get(quote.id) ?? null;
        const latestOrder = project?.id
          ? orderByProjectId.get(project.id) ?? null
          : null;
        return mapQuoteToPreInvoiceCard(quote, project, latestOrder);
      });

    setCards(nextCards);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const stats = useMemo(() => buildPreInvoiceStats(cards), [cards]);

  return (
    <main className="relative min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl pb-28">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pre-Invoices
            </h1>
            <button
              type="button"
              onClick={noop("Help info")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="About Pre-Invoices"
            >
              <IconInfo className="h-5 w-5" />
            </button>
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Create pre-invoices with voice, get supplier prices, send quotes to
            customers, order materials and start projects - all in one place.
          </p>
        </header>

        <div className="mt-6">
          <PreInvoiceVoiceCapture
            onProjectCreated={() => {
              setIsLoading(true);
              void loadCards();
            }}
          />
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <button
              key={stat.id}
              type="button"
              onClick={noop(`Stat filter ${stat.id}`)}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-accent/30 hover:bg-white/[0.05]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/25">
                {statIcon(stat.id)}
              </span>
              <p className="mt-3 text-2xl font-bold text-white">{stat.count}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{stat.label}</p>
            </button>
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

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

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
              <ProjectCard key={project.id} project={project} />
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
          <button
            type="button"
            onClick={noop("View Workflow Guide")}
            className={`${touchBtnSecondary} shrink-0 px-4 text-sm`}
          >
            View Workflow Guide
          </button>
        </section>
      </div>

      <button
        type="button"
        onClick={noop("Ema AI speak")}
        className="fixed bottom-24 left-4 z-40 flex items-center gap-3 rounded-2xl border border-accent/30 bg-[#0B1220]/95 px-3.5 py-3 shadow-xl shadow-black/40 backdrop-blur transition hover:border-accent/50 hover:bg-[#0B1220] lg:bottom-6 lg:left-[16.5rem]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan-400 text-sm font-bold text-white shadow-md shadow-accent/30">
          E
        </span>
        <span className="pr-1 text-left">
          <span className="block text-sm font-semibold text-white">Ema AI</span>
          <span className="block text-[11px] text-slate-400">Your AI Assistant</span>
          <span className="mt-0.5 block text-[10px] font-medium text-accent">
            Click to speak
          </span>
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
          <IconMicrophone className="h-4 w-4" />
        </span>
      </button>
    </main>
  );
}
