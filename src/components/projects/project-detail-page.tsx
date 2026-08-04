"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCalendar,
  IconCheckCircle,
  IconDocument,
  IconMicrophone,
} from "@/components/dashboard/icons";
import {
  IconLocation,
  IconPhone,
} from "@/components/dashboard/workspace-icons";
import { AddEndDateControl } from "@/components/projects/detail/add-end-date-control";
import { ExpensesCard } from "@/components/projects/detail/expenses-card";
import { FinancialSummaryCard } from "@/components/projects/detail/financial-summary-card";
import { MaterialsPricingCard } from "@/components/projects/detail/materials-pricing-card";
import { ProjectProgressCard } from "@/components/projects/detail/project-progress-card";
import { RecentActivityCard } from "@/components/projects/detail/recent-activity-card";
import { TasksOverviewCard } from "@/components/projects/detail/tasks-overview-card";
import { TeamTimeCard } from "@/components/projects/detail/team-time-card";
import { WorkflowStepsBar } from "@/components/projects/detail/workflow-steps-bar";
import { ProjectAssignedEmployees } from "@/components/projects/project-assigned-employees";
import {
  EditProjectOverviewModal,
  type ProjectOverviewFormData,
} from "@/components/projects/edit-project-overview-modal";
import { formatProjectDetailMoney } from "@/lib/project-detail-mock";
import {
  PRE_INVOICE_WORKFLOW_STEPS,
  type ProjectWorkflowStep,
  type WorkflowStepId,
} from "@/lib/pre-invoices";
import type { Employee } from "@/types/employee";
import type { MaterialOrder } from "@/types/material-order";
import {
  computeTaskCompletionPercent,
  type ProjectActivity,
  type ProjectExpense,
  type ProjectPayment,
  type ProjectTask,
  type TimeEntry,
} from "@/types/project-operations";
import {
  formatProjectDate,
  type ProjectStatus,
} from "@/types/project";
import type { StoredMaterial } from "@/types/quote";

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function IconDollar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconCube({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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

export interface ProjectDetailDashboardProps {
  projectId: string;
  customerId: string;
  projectName: string;
  customerName: string;
  customerPhone: string;
  address: string;
  createdLabel: string;
  quoteAmount: number;
  depositAmount: number;
  description: string;
  projectType: string;
  projectManager: string;
  internalProjectNumber: string;
  quoteId: string | null;
  quotePdfPath: string | null;
  quoteStatus: string | null;
  projectStatus: ProjectStatus;
  startDateConfirmed: boolean;
  rawStartDate: string | null;
  rawEndDate: string | null;
  materialOrder: MaterialOrder | null;
  projectMaterials: StoredMaterial[];
  workflowSteps: ProjectWorkflowStep[];
  workflowActionLabel: string | null;
  workflowNextText: string;
  initialTasks: ProjectTask[];
  initialExpenses: ProjectExpense[];
  initialPayments: ProjectPayment[];
  initialTimeEntries: TimeEntry[];
  initialActivities: ProjectActivity[];
  assignedEmployees: Employee[];
  allEmployees: Pick<Employee, "id" | "full_name">[];
}

export function ProjectDetailPage(props: ProjectDetailDashboardProps) {
  const {
    projectId,
    customerId,
    projectName,
    customerName,
    customerPhone,
    address,
    createdLabel,
    quoteAmount,
    depositAmount,
    description,
    projectType,
    projectManager,
    internalProjectNumber,
    quoteId,
    quotePdfPath,
    quoteStatus,
    materialOrder,
    projectMaterials,
    workflowSteps,
    workflowActionLabel,
    workflowNextText,
    allEmployees,
  } = props;

  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [overviewEditOpen, setOverviewEditOpen] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [liveDescription, setLiveDescription] = useState(description);
  const [liveAddress, setLiveAddress] = useState(address);
  const [liveProjectType, setLiveProjectType] = useState(projectType);
  const [liveProjectManager, setLiveProjectManager] = useState(projectManager);
  const [liveStartDate, setLiveStartDate] = useState<string | null>(
    props.startDateConfirmed ? props.rawStartDate : null
  );
  const [liveStartConfirmed, setLiveStartConfirmed] = useState(
    props.startDateConfirmed
  );
  const [liveEndDate, setLiveEndDate] = useState<string | null>(props.rawEndDate);
  const [liveStatus, setLiveStatus] = useState<ProjectStatus>(props.projectStatus);
  const [liveOrder, setLiveOrder] = useState<MaterialOrder | null>(materialOrder);
  const [tasks, setTasks] = useState(props.initialTasks);
  const [expenses, setExpenses] = useState(props.initialExpenses);
  const [payments, setPayments] = useState(props.initialPayments);
  const [activities, setActivities] = useState(props.initialActivities);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTasks(props.initialTasks);
    setExpenses(props.initialExpenses);
    setPayments(props.initialPayments);
    setActivities(props.initialActivities);
  }, [
    props.initialTasks,
    props.initialExpenses,
    props.initialPayments,
    props.initialActivities,
  ]);

  const projectStarted =
    liveStatus === "in_progress" || liveStatus === "completed";
  const materialsReceived = Boolean(liveOrder?.materials_received_at);
  const canStartProject =
    liveStartConfirmed &&
    Boolean(liveOrder?.status === "confirmed" && materialsReceived) &&
    liveStatus !== "in_progress" &&
    liveStatus !== "completed";

  const completionPercent = computeTaskCompletionPercent(tasks);
  const orderMaterialsHref = `/dashboard/customers/${customerId}/projects/${projectId}/order-materials`;
  const projectsListHref = "/dashboard/quotes";
  const statusBadgeLabel = projectStarted
    ? liveStatus === "completed"
      ? "Completed"
      : "In Progress"
    : workflowActionLabel
      ? "Ready to Start"
      : "Quote Accepted";

  const primaryCta = useMemo(() => {
    if (projectStarted) {
      if (quotePdfPath) {
        return { kind: "view_quote" as const, label: "View Quote" };
      }
      return { kind: "notify" as const, label: "Notify Assigned Employees" };
    }
    if (canStartProject) {
      return { kind: "start" as const, label: "Start Project" };
    }
    if (quoteStatus === "accepted" || quoteStatus === "sent") {
      if (!liveOrder) {
        return { kind: "order" as const, label: "Order Materials" };
      }
      if (liveOrder.status === "confirmed" && !materialsReceived) {
        return { kind: "mark_received" as const, label: "Mark Materials Received" };
      }
      if (!liveStartConfirmed) {
        return { kind: "set_date" as const, label: "Set Start Date" };
      }
    }
    if (quotePdfPath || quoteStatus === "sent" || quoteStatus === "accepted") {
      return { kind: "view_quote" as const, label: "View Quote" };
    }
    if (quoteId) {
      return { kind: "create_quote" as const, label: "Create Quote" };
    }
    return { kind: "order" as const, label: "Order Materials" };
  }, [
    projectStarted,
    canStartProject,
    quotePdfPath,
    quoteStatus,
    liveOrder,
    materialsReceived,
    liveStartConfirmed,
    quoteId,
  ]);

  async function handleStartDateChange(value: string) {
    if (!value) return;
    setActionError(null);
    setActionBusy("start-date");
    try {
      const response = await fetch(`/api/projects/${projectId}/start-date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionError(data.error || "Failed to save start date.");
        return;
      }
      setLiveStartDate(data.startDate || value);
      setLiveStartConfirmed(true);
    } catch {
      setActionError("Failed to save start date.");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleMarkMaterialsReceived() {
    if (!liveOrder?.id) return;
    setActionError(null);
    setActionBusy("mark-received");
    try {
      const response = await fetch(
        `/api/material-orders/${liveOrder.id}/mark-received`,
        { method: "POST" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionError(data.error || "Failed to mark materials received.");
        return;
      }
      setLiveOrder((current) =>
        current
          ? {
              ...current,
              materials_received_at:
                data.materialsReceivedAt || new Date().toISOString(),
            }
          : current
      );
    } catch {
      setActionError("Failed to mark materials received.");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleStartProject() {
    setActionError(null);
    setActionSuccess(null);
    setActionBusy("start-project");
    try {
      const response = await fetch(`/api/projects/${projectId}/start`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionError(data.error || "Failed to start project.");
        return;
      }
      setLiveStatus("in_progress");
      if (Array.isArray(data.emailErrors) && data.emailErrors.length > 0) {
        setActionError(
          `Project started. Employee email warning: ${data.emailErrors[0]}`
        );
      } else if (typeof data.emailsSent === "number" && data.emailsSent > 0) {
        setActionSuccess(`Project started. Notified ${data.emailsSent} employee(s).`);
      }
    } catch {
      setActionError("Failed to start project.");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleNotifyEmployees() {
    setActionError(null);
    setActionSuccess(null);
    setActionBusy("notify");
    try {
      const response = await fetch(`/api/projects/${projectId}/notify-employees`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionError(data.error || "Failed to notify employees.");
        return;
      }
      if (data.emailsSent === 0) {
        setActionError(
          data.message ||
            "No emails sent. Assign employees with valid email addresses first."
        );
        return;
      }
      setActionSuccess(`Notification sent to ${data.emailsSent} employee(s).`);
      if (Array.isArray(data.emailErrors) && data.emailErrors.length > 0) {
        setActionError(`Partial send: ${data.emailErrors[0]}`);
      }
    } catch {
      setActionError("Failed to notify employees.");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleSaveOverview(form: ProjectOverviewFormData) {
    setActionError(null);
    setOverviewSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/overview`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          address: form.address,
          projectType: form.projectType,
          projectManager: form.projectManager,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save project overview.");
      }
      setLiveDescription(data.description || form.description);
      setLiveAddress(
        (typeof data.address === "string" && data.address.trim()) ||
          form.address.trim() ||
          "—"
      );
      setLiveProjectType(data.projectType || form.projectType);
      setLiveProjectManager(data.projectManager || form.projectManager);
      setOverviewEditOpen(false);
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Failed to save project overview.");
    } finally {
      setOverviewSaving(false);
    }
  }

  function openStartDatePicker() {
    const input = startDateInputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch {
        // ignore
      }
    }
  }

  function renderPrimaryCta() {
    switch (primaryCta.kind) {
      case "start":
        return (
          <button
            type="button"
            disabled={actionBusy === "start-project"}
            onClick={() => void handleStartProject()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600 disabled:opacity-60"
          >
            <IconPlay className="h-4 w-4" />
            {actionBusy === "start-project" ? "Starting…" : "Start Project"}
          </button>
        );
      case "notify":
        return (
          <button
            type="button"
            disabled={actionBusy === "notify"}
            onClick={() => void handleNotifyEmployees()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600 disabled:opacity-60"
          >
            {actionBusy === "notify" ? "Sending…" : "Notify Assigned Employees"}
          </button>
        );
      case "view_quote":
        return (
          <Link
            href={
              quoteId
                ? `/dashboard/quotes?quoteId=${quoteId}`
                : projectsListHref
            }
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
          >
            <IconDocument className="h-4 w-4" />
            View Quote
          </Link>
        );
      case "create_quote":
        return (
          <Link
            href={
              quoteId
                ? `/dashboard/quotes?quoteId=${quoteId}`
                : "/dashboard/voice-quote-builder"
            }
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
          >
            Create Quote
          </Link>
        );
      case "order":
        return (
          <Link
            href={orderMaterialsHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
          >
            <IconCube className="h-4 w-4" />
            Order Materials
          </Link>
        );
      case "mark_received":
        return (
          <button
            type="button"
            disabled={actionBusy === "mark-received"}
            onClick={() => void handleMarkMaterialsReceived()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600 disabled:opacity-60"
          >
            {actionBusy === "mark-received" ? "Saving…" : "Mark Materials Received"}
          </button>
        );
      case "set_date":
        return (
          <button
            type="button"
            onClick={openStartDatePicker}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
          >
            <IconCalendar className="h-4 w-4" />
            Set Start Date
          </button>
        );
      default:
        return null;
    }
  }

  const nextActiveStep = useMemo(() => {
    const active = workflowSteps.find((s) => s.state === "active");
    if (active) {
      const def = PRE_INVOICE_WORKFLOW_STEPS.find((d) => d.id === active.id);
      return def ?? null;
    }
    return null;
  }, [workflowSteps]);

  const nextStepLabel = nextActiveStep?.title ?? null;

  function handleSaveAsDraft() {
    setActionError(null);
    setActionSuccess("Saved as draft.");
  }

  function handleNextStep() {
    if (!nextActiveStep) return;
    const stepId: WorkflowStepId = nextActiveStep.id;

    switch (stepId) {
      case "voice_materials":
        router.push("/dashboard/voice-quote-builder");
        return;
      case "send_supplier":
      case "upload_prices":
      case "create_quote":
      case "send_customer":
      case "customer_accept":
        if (quoteId) {
          router.push(`/dashboard/quotes?quoteId=${quoteId}`);
        } else {
          router.push("/dashboard/quotes");
        }
        return;
      case "order_materials":
        router.push(orderMaterialsHref);
        return;
      case "materials_ready":
        if (liveOrder?.status === "confirmed" && !materialsReceived) {
          void handleMarkMaterialsReceived();
        } else {
          router.push(orderMaterialsHref);
        }
        return;
      case "schedule_project":
        openStartDatePicker();
        return;
      case "start_project":
        void handleStartProject();
        return;
      default:
        return;
    }
  }

  return (
    <div className="relative flex w-full flex-1 flex-col pb-28">
      <div className="border-b border-white/10 bg-[#0B1220]/80 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          <Link href={projectsListHref} className="transition hover:text-accent">
            Projects
          </Link>
          <span className="text-slate-600">›</span>
          <Link
            href={`/dashboard/customers/${customerId}`}
            className="transition hover:text-accent"
          >
            {customerName}
          </Link>
          <span className="text-slate-600">›</span>
          <span className="text-slate-300">{projectName}</span>
        </nav>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {projectName}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${
                  projectStarted
                    ? "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30"
                    : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                }`}
              >
                {statusBadgeLabel}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
              <MetaItem
                icon={<IconPhone className="h-3.5 w-3.5" />}
                label={customerName}
              />
              <MetaItem
                icon={<IconLocation className="h-3.5 w-3.5" />}
                label={liveAddress}
              />
              <MetaItem
                icon={<IconCalendar className="h-3.5 w-3.5" />}
                label={`Created ${createdLabel}`}
              />
              <MetaItem
                icon={<IconDollar className="h-3.5 w-3.5" />}
                label={formatProjectDetailMoney(quoteAmount)}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            <a
              href={customerPhone && customerPhone !== "—" ? `tel:${customerPhone}` : undefined}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <IconChat className="h-4 w-4" />
              Contact Customer
            </a>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                More
                <IconChevronDown className="h-3.5 w-3.5" />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      setOverviewEditOpen(true);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                  >
                    Edit overview
                  </button>
                  {projectStarted ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        void handleNotifyEmployees();
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                    >
                      Notify assigned employees
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {projectStarted ? (
              <span className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-500/30">
                <IconCheckCircle className="h-4 w-4" />
                In Progress
              </span>
            ) : null}
            {renderPrimaryCta()}
          </div>
        </div>

        {actionError ? (
          <p className="mt-3 text-sm text-red-300">{actionError}</p>
        ) : null}
        {actionSuccess ? (
          <p className="mt-3 text-sm text-emerald-300">{actionSuccess}</p>
        ) : null}
        <p className="mt-2 text-sm text-slate-500">{workflowNextText}</p>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <WorkflowStepsBar steps={workflowSteps} />

        <input
          ref={startDateInputRef}
          type="date"
          className="sr-only"
          value={liveStartDate || ""}
          onChange={(event) => void handleStartDateChange(event.target.value)}
        />

        {/* STATE A — pre-start */}
        {!projectStarted ? (
          <div className="grid gap-5 xl:grid-cols-12">
            <div className="space-y-5 xl:col-span-8">
              <MaterialsPricingCard
                customerId={customerId}
                projectId={projectId}
                materialOrder={liveOrder}
                projectMaterials={projectMaterials}
              />
            </div>
            <div className="space-y-5 xl:col-span-4">
              <ProjectAssignedEmployees projectId={projectId} />
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Project Overview
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOverviewEditOpen(true)}
                    className="text-xs font-semibold text-accent hover:text-blue-400"
                  >
                    Edit
                  </button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {liveDescription || "No description yet."}
                </p>
                <dl className="mt-4 space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between gap-3">
                    <dt>Type</dt>
                    <dd className="text-slate-200">{liveProjectType}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Manager</dt>
                    <dd className="text-slate-200">{liveProjectManager}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Internal #</dt>
                    <dd className="font-mono text-slate-200">
                      {internalProjectNumber}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Start date</dt>
                    <dd className="text-slate-200">
                      {liveStartConfirmed
                        ? formatProjectDate(liveStartDate)
                        : "Not set"}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        ) : (
          /* STATE B — post-start operational dashboard */
          <div className="grid gap-5 xl:grid-cols-12">
            <div className="space-y-5 xl:col-span-8">
              <MaterialsPricingCard
                customerId={customerId}
                projectId={projectId}
                materialOrder={liveOrder}
                projectMaterials={projectMaterials}
              />
              <TasksOverviewCard
                projectId={projectId}
                initialTasks={tasks}
                employees={allEmployees}
                onTasksChange={setTasks}
              />
              <ExpensesCard
                projectId={projectId}
                initialExpenses={expenses}
                onExpensesChange={setExpenses}
              />
              <TeamTimeCard
                projectId={projectId}
                assignedEmployees={props.assignedEmployees}
                initialEntries={props.initialTimeEntries}
              />
            </div>
            <div className="space-y-5 xl:col-span-4">
              <ProjectProgressCard
                completionPercent={completionPercent}
                startDate={liveStartDate}
                endDate={liveEndDate}
                startDateConfirmed={liveStartConfirmed}
              />
              <AddEndDateControl
                projectId={projectId}
                endDate={liveEndDate}
                onEndDateSaved={setLiveEndDate}
              />
              <FinancialSummaryCard
                projectId={projectId}
                quoteAmount={quoteAmount}
                depositAmount={depositAmount}
                payments={payments}
                expenses={expenses}
                onPaymentAdded={(payment) =>
                  setPayments((current) => [payment, ...current])
                }
              />
              <ProjectAssignedEmployees projectId={projectId} />
              <RecentActivityCard activities={activities} />
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={projectsListHref}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Back to Projects
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleSaveAsDraft}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                Save as Draft
              </button>
              {nextStepLabel ? (
                <button
                  type="button"
                  disabled={Boolean(actionBusy)}
                  onClick={handleNextStep}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                >
                  Next Step: {nextStepLabel}
                </button>
              ) : (
                <span className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  All Steps Complete
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <button
        type="button"
        className="fixed bottom-24 left-4 z-40 flex items-center gap-3 rounded-2xl border border-accent/30 bg-[#0B1220]/95 px-3.5 py-3 shadow-xl shadow-black/40 backdrop-blur lg:bottom-6 lg:left-[16.5rem]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan-400 text-sm font-bold text-white">
          E
        </span>
        <span className="pr-1 text-left">
          <span className="block text-sm font-semibold text-white">Ema AI</span>
          <span className="block text-[11px] text-slate-400">Your AI Assistant</span>
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
          <IconMicrophone className="h-4 w-4" />
        </span>
      </button>

      {overviewEditOpen ? (
        <EditProjectOverviewModal
          customerId={customerId}
          customerName={customerName}
          internalProjectNumber={internalProjectNumber}
          initialForm={{
            description: liveDescription,
            address: liveAddress === "—" ? "" : liveAddress,
            projectType: liveProjectType,
            projectManager: liveProjectManager,
          }}
          isSaving={overviewSaving}
          onClose={() => {
            if (!overviewSaving) setOverviewEditOpen(false);
          }}
          onSave={handleSaveOverview}
        />
      ) : null}
    </div>
  );
}

function MetaItem({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 text-sm text-slate-400">
      <span className="text-cyan-400/90">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}
