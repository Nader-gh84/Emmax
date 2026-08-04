"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconDocument,
  IconDocumentDraft,
  IconInvoice,
  IconMicrophone,
  IconUsers,
} from "@/components/dashboard/icons";
import {
  IconLocation,
  IconPhone,
  IconProjects,
} from "@/components/dashboard/workspace-icons";
import {
  EditProjectOverviewModal,
  type ProjectOverviewFormData,
} from "@/components/projects/edit-project-overview-modal";
import { ProjectAssignedEmployees } from "@/components/projects/project-assigned-employees";
import {
  formatProjectDetailMoney,
  PROJECT_DETAIL_TABS,
  type ProjectDetailMock,
  type ProjectDetailTab,
} from "@/lib/project-detail-mock";
import {
  formatAvailabilityLabel,
  type MaterialOrder,
} from "@/types/material-order";
import {
  formatProjectDate,
  type ProjectStatus,
} from "@/types/project";

function noop(label: string) {
  return () => {
    console.log(`[ProjectDetail] ${label}`);
  };
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
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

function IconChartBar({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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

function IconActivity({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function IconStatus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function tabIcon(tab: ProjectDetailTab, className = "h-4 w-4") {
  switch (tab) {
    case "overview":
      return <IconProjects className={className} />;
    case "scope":
      return <IconClipboard className={className} />;
    case "tasks":
      return <IconCheckCircle className={className} />;
    case "materials":
      return <IconCube className={className} />;
    case "documents":
      return <IconDocument className={className} />;
    case "financials":
      return <IconInvoice className={className} />;
    case "activity":
      return <IconActivity className={className} />;
    default:
      return <IconDocumentDraft className={className} />;
  }
}

function DonutChart({
  percent,
  color,
  track = "rgba(255,255,255,0.08)",
  size = 112,
  stroke = 10,
  centerLabel,
  centerSub,
}: {
  percent: number;
  color: string;
  track?: string;
  size?: number;
  stroke?: number;
  centerLabel: string;
  centerSub?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-bold text-white">{centerLabel}</span>
        {centerSub ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {centerSub}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ProjectDetailPage({
  project,
  materialOrder = null,
  projectStatus = "active",
  startDateConfirmed = false,
  rawStartDate = null,
}: {
  project: ProjectDetailMock;
  materialOrder?: MaterialOrder | null;
  projectStatus?: ProjectStatus;
  startDateConfirmed?: boolean;
  rawStartDate?: string | null;
}) {
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>("overview");
  const [moreOpen, setMoreOpen] = useState(false);
  const [liveProject, setLiveProject] = useState(project);
  const [overviewEditOpen, setOverviewEditOpen] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [liveStartDate, setLiveStartDate] = useState<string | null>(
    startDateConfirmed ? rawStartDate : null
  );
  const [liveStartConfirmed, setLiveStartConfirmed] =
    useState(startDateConfirmed);
  const [liveStatus, setLiveStatus] = useState<ProjectStatus>(projectStatus);
  const [liveOrder, setLiveOrder] = useState<MaterialOrder | null>(materialOrder);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLiveProject(project);
  }, [project]);

  const orderMaterialsHref = `/dashboard/customers/${liveProject.customerId}/projects/${liveProject.id}/order-materials`;
  const materialsReceived = Boolean(liveOrder?.materials_received_at);
  const canStartProject =
    liveStartConfirmed &&
    Boolean(liveOrder?.status === "confirmed" && materialsReceived) &&
    liveStatus !== "in_progress";
  const projectStarted = liveStatus === "in_progress";

  const readinessLabel = projectStarted
    ? "In Progress"
    : project.readinessLabel;
  const readinessSubtext = projectStarted
    ? "Project started"
    : project.readinessSubtext;
  const statusBadgeLabel = projectStarted
    ? "In Progress"
    : project.statusLabel;
  const displayStartDate = liveStartConfirmed
    ? formatProjectDate(liveStartDate)
    : "Not set";

  const nextSteps = useMemo(() => {
    return project.nextSteps.map((step) => {
      if (step.id === "1") {
        if (liveStartConfirmed) {
          return {
            ...step,
            completed: true,
            disabled: false,
            tag: "Done",
            tagTone: "done" as const,
          };
        }
        return step;
      }
      if (step.id === "4") {
        if (materialsReceived) {
          return {
            ...step,
            completed: true,
            disabled: false,
            tag: "Done",
            tagTone: "done" as const,
          };
        }
        if (liveOrder?.status === "confirmed") {
          return {
            ...step,
            tag: "Receive materials",
            tagTone: "required" as const,
            disabled: false,
          };
        }
        if (liveOrder?.status === "sent") {
          return {
            ...step,
            tag: "Awaiting supplier",
            tagTone: "info" as const,
            disabled: false,
          };
        }
        return step;
      }
      if (step.id === "5") {
        if (projectStarted) {
          return {
            ...step,
            completed: true,
            disabled: false,
            tag: "Done",
            tagTone: "done" as const,
          };
        }
        if (canStartProject) {
          return {
            ...step,
            disabled: false,
            tag: "Ready",
            tagTone: "info" as const,
          };
        }
        return step;
      }
      return step;
    });
  }, [
    canStartProject,
    liveOrder?.status,
    liveStartConfirmed,
    materialsReceived,
    project.nextSteps,
    projectStarted,
  ]);

  const scopePreview = useMemo(
    () => project.scopeItems.slice(0, 6),
    [project.scopeItems]
  );

  const taskTotal =
    project.taskStats.toDo +
    project.taskStats.inProgress +
    project.taskStats.completed +
    project.taskStats.overdue;

  const materialTotal =
    project.materialStats.notOrdered +
    project.materialStats.ordered +
    project.materialStats.received +
    project.materialStats.used +
    project.materialStats.returned;

  async function handleStartDateChange(value: string) {
    if (!value) return;
    setActionError(null);
    setActionBusy("start-date");
    try {
      const response = await fetch(
        `/api/projects/${project.id}/start-date`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: value }),
        }
      );
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
    setActionBusy("start-project");
    try {
      const response = await fetch(`/api/projects/${project.id}/start`, {
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
      }
    } catch {
      setActionError("Failed to start project.");
    } finally {
      setActionBusy(null);
    }
  }

  async function handleSaveOverview(form: ProjectOverviewFormData) {
    setActionError(null);
    setOverviewSaving(true);
    try {
      const response = await fetch(`/api/projects/${liveProject.id}/overview`, {
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
        // Description may have been saved even when overview columns are missing.
        if (
          response.status === 409 &&
          data.partial &&
          typeof data.description === "string"
        ) {
          setLiveProject((current) => ({
            ...current,
            description: data.description,
          }));
        }

        const message =
          (typeof data.error === "string" && data.error) ||
          "Failed to save project overview.";
        setActionError(message);
        throw new Error(message);
      }

      const savedAddress =
        (typeof data.address === "string" ? data.address.trim() : "") ||
        form.address.trim();

      setLiveProject((current) => ({
        ...current,
        description: data.description || form.description,
        address: savedAddress || "—",
        projectType: data.projectType || form.projectType,
        projectManager: data.projectManager || form.projectManager,
      }));
      setActionError(null);
      setOverviewEditOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save project overview.";
      setActionError(message);
      throw error instanceof Error ? error : new Error(message);
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

  return (
    <div className="relative flex w-full flex-1 flex-col pb-28">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0B1220]/80 px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          <Link href="/dashboard" className="transition hover:text-accent">
            Dashboard
          </Link>
          <span className="text-slate-600">›</span>
          <Link
            href="/dashboard/customers"
            className="transition hover:text-accent"
          >
            Customers
          </Link>
          <span className="text-slate-600">›</span>
          <Link
            href={`/dashboard/customers/${liveProject.customerId}`}
            className="transition hover:text-accent"
          >
            {liveProject.customerName}
          </Link>
          <span className="text-slate-600">›</span>
          <span className="text-slate-300">{liveProject.projectName}</span>
        </nav>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {liveProject.projectName}
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
                label={liveProject.customerName}
              />
              <MetaItem
                icon={<IconLocation className="h-3.5 w-3.5" />}
                label={liveProject.address}
              />
              <MetaItem
                icon={<IconCalendar className="h-3.5 w-3.5" />}
                label={`Accepted ${liveProject.acceptedDate}`}
              />
              <MetaItem
                icon={<IconDollar className="h-3.5 w-3.5" />}
                label={formatProjectDetailMoney(liveProject.quoteAmount)}
              />
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            <button
              type="button"
              onClick={noop("Contact Customer")}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <IconChat className="h-4 w-4" />
              Contact Customer
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                aria-expanded={moreOpen}
              >
                More
                <IconChevronDown className="h-3.5 w-3.5" />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
                  {["Duplicate project", "Export summary", "Archive project"].map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setMoreOpen(false);
                          noop(item)();
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </div>

            {projectStarted ? (
              <button
                type="button"
                disabled
                className="inline-flex min-h-[44px] cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-cyan-500/30 px-5 text-sm font-semibold text-cyan-100"
              >
                <IconCheckCircle className="h-4 w-4" />
                In Progress
              </button>
            ) : canStartProject ? (
              <button
                type="button"
                disabled={actionBusy === "start-project"}
                onClick={() => void handleStartProject()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600 disabled:opacity-60"
              >
                <IconPlay className="h-4 w-4" />
                {actionBusy === "start-project" ? "Starting…" : "Start Project"}
              </button>
            ) : (
              <Link
                href={orderMaterialsHref}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-blue-600"
                title="Complete start date + materials received to activate Start Project"
              >
                <IconCube className="h-4 w-4" />
                Order Materials
              </Link>
            )}
          </div>
        </div>
        {actionError ? (
          <p className="mt-3 text-sm text-red-300">{actionError}</p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Project Status"
            value={readinessLabel}
            valueClass={
              projectStarted ? "text-cyan-300" : "text-amber-400"
            }
            subtext={readinessSubtext}
            icon={<IconStatus className="h-4 w-4" />}
            iconWell={
              projectStarted
                ? "bg-cyan-500/15 text-cyan-300"
                : "bg-amber-500/15 text-amber-300"
            }
          />
          <StatCard
            label="Quote Amount"
            value={formatProjectDetailMoney(project.quoteAmount)}
            valueClass="text-emerald-400"
            subtext="Accepted"
            icon={<IconDocument className="h-4 w-4" />}
            iconWell="bg-emerald-500/15 text-emerald-300"
          />
          <button
            type="button"
            onClick={openStartDatePicker}
            disabled={actionBusy === "start-date"}
            className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-60"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start Date
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">
                <IconCalendar className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-white">
              {displayStartDate}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {liveStartConfirmed ? "Click to change date" : "Click to set date"}
            </p>
            <input
              ref={startDateInputRef}
              type="date"
              value={liveStartDate || ""}
              onChange={(event) =>
                void handleStartDateChange(event.target.value)
              }
              className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          </button>
          <StatCard
            label="Progress"
            value={`${projectStarted ? Math.max(project.progressPercent, 10) : project.progressPercent}%`}
            valueClass="text-white"
            subtext={null}
            icon={<IconChartBar className="h-4 w-4" />}
            iconWell="bg-accent/15 text-accent"
          >
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${projectStarted ? Math.max(project.progressPercent, 10) : project.progressPercent}%`,
                }}
              />
            </div>
          </StatCard>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto border-b border-white/10">
          <div className="flex min-w-max gap-1 pb-px">
            {PROJECT_DETAIL_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-accent text-white"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className={isActive ? "text-accent" : "text-slate-500"}>
                    {tabIcon(tab.id)}
                  </span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "overview" ? (
          <OverviewTab
            project={liveProject}
            nextSteps={nextSteps}
            materialOrder={liveOrder}
            scopePreview={scopePreview}
            taskTotal={taskTotal}
            materialTotal={materialTotal}
            onMarkMaterialsReceived={() => void handleMarkMaterialsReceived()}
            markReceivedBusy={actionBusy === "mark-received"}
            onEditOverview={() => setOverviewEditOpen(true)}
          />
        ) : (
          <PlaceholderTab
            label={
              PROJECT_DETAIL_TABS.find((t) => t.id === activeTab)?.label ??
              activeTab
            }
          />
        )}

        {/* Quick Actions */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Quick Actions
            </p>
            <div className="flex flex-wrap gap-2">
              <QuickAction
                label="Add Task"
                className="bg-accent/15 text-accent ring-accent/30 hover:bg-accent/25"
                onClick={noop("Add Task")}
              />
              <QuickAction
                label="Add Material"
                className="bg-emerald-500/15 text-emerald-300 ring-emerald-500/30 hover:bg-emerald-500/25"
                onClick={noop("Add Material")}
              />
              <QuickAction
                label="Upload Document"
                className="bg-orange-500/15 text-orange-300 ring-orange-500/30 hover:bg-orange-500/25"
                onClick={noop("Upload Document")}
              />
              <QuickAction
                label="Add Note"
                className="bg-amber-500/15 text-amber-300 ring-amber-500/30 hover:bg-amber-500/25"
                onClick={noop("Add Note")}
              />
              <QuickAction
                label="Voice Command"
                className="bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30 hover:bg-fuchsia-500/25"
                icon={<IconMicrophone className="h-3.5 w-3.5" />}
                onClick={noop("Voice Command")}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Floating Ema AI */}
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
          <span className="block text-[11px] text-slate-400">
            Your AI Assistant
          </span>
          <span className="mt-0.5 block text-[10px] font-medium text-accent">
            Click to speak
          </span>
        </span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/30">
          <IconMicrophone className="h-4 w-4" />
        </span>
      </button>

      {overviewEditOpen ? (
        <EditProjectOverviewModal
          customerId={liveProject.customerId}
          customerName={liveProject.customerName}
          internalProjectNumber={liveProject.internalProjectNumber}
          initialForm={{
            description: liveProject.description,
            address: liveProject.address === "—" ? "" : liveProject.address,
            projectType: liveProject.projectType,
            projectManager: liveProject.projectManager,
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

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
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

function StatCard({
  label,
  value,
  valueClass,
  subtext,
  icon,
  iconWell,
  children,
}: {
  label: string;
  value: string;
  valueClass: string;
  subtext: string | null;
  icon: React.ReactNode;
  iconWell: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full ${iconWell}`}
        >
          {icon}
        </span>
      </div>
      <p className={`mt-3 text-2xl font-bold ${valueClass}`}>{value}</p>
      {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
      {children}
    </div>
  );
}

function OverviewTab({
  project,
  nextSteps,
  materialOrder,
  scopePreview,
  taskTotal,
  materialTotal,
  onMarkMaterialsReceived,
  markReceivedBusy,
  onEditOverview,
}: {
  project: ProjectDetailMock;
  nextSteps: ProjectDetailMock["nextSteps"];
  materialOrder: MaterialOrder | null;
  scopePreview: string[];
  taskTotal: number;
  materialTotal: number;
  onMarkMaterialsReceived: () => void;
  markReceivedBusy: boolean;
  onEditOverview: () => void;
}) {
  const completedPct =
    taskTotal === 0
      ? 0
      : Math.round((project.taskStats.completed / taskTotal) * 100);

  const materialLegend = [
    {
      label: "Not Ordered",
      count: project.materialStats.notOrdered,
      color: "bg-slate-400",
    },
    {
      label: "Ordered",
      count: project.materialStats.ordered,
      color: "bg-accent",
    },
    {
      label: "Received",
      count: project.materialStats.received,
      color: "bg-emerald-400",
    },
    {
      label: "Used",
      count: project.materialStats.used,
      color: "bg-cyan-400",
    },
    {
      label: "Returned",
      count: project.materialStats.returned,
      color: "bg-amber-400",
    },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      {/* Column 1 */}
      <div className="space-y-5 xl:col-span-5">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Project Overview
            </h2>
            <button
              type="button"
              onClick={onEditOverview}
              className="text-xs font-semibold text-accent hover:text-blue-400"
            >
              Edit
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {project.description}
          </p>
          <dl className="mt-5 space-y-3 border-t border-white/10 pt-4">
            <OverviewRow
              icon={<IconUsers className="h-4 w-4" />}
              label="Customer"
              value={
                <span className="inline-flex items-center gap-2">
                  {project.customerName}
                  <IconPhone className="h-3.5 w-3.5 text-cyan-400/80" />
                </span>
              }
            />
            <OverviewRow
              icon={<IconLocation className="h-4 w-4" />}
              label="Address"
              value={project.address}
            />
            <OverviewRow
              icon={<IconProjects className="h-4 w-4" />}
              label="Project Type"
              value={project.projectType}
            />
            <OverviewRow
              icon={<IconUsers className="h-4 w-4" />}
              label="Project Manager"
              value={project.projectManager}
            />
            <OverviewRow
              icon={<IconDocumentDraft className="h-4 w-4" />}
              label="Internal Project #"
              value={
                <span className="font-mono text-slate-200">
                  {project.internalProjectNumber}
                </span>
              }
            />
          </dl>
        </section>

        <ProjectAssignedEmployees projectId={project.id} />

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Scope of Work
            </h2>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent ring-1 ring-accent/25">
              {project.scopeItems.length} items
            </span>
          </div>
          <ul className="mt-4 space-y-2.5">
            {scopePreview.map((item, index) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    [
                      "bg-accent",
                      "bg-cyan-400",
                      "bg-emerald-400",
                      "bg-amber-400",
                      "bg-fuchsia-400",
                      "bg-orange-400",
                    ][index % 6]
                  }`}
                />
                {item}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={noop("View Full Scope")}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-blue-400"
          >
            View Full Scope
            <IconChevron className="h-4 w-4" />
          </button>
        </section>
      </div>

      {/* Column 2 */}
      <div className="space-y-5 xl:col-span-4">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Next Steps
          </h2>
          <ol className="mt-4 space-y-3">
            {nextSteps.map((step, index) => (
              <li
                key={step.id}
                className={`flex items-start gap-3 ${
                  step.disabled && !step.completed ? "opacity-45" : ""
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.completed
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-slate-300"
                  }`}
                >
                  {step.completed ? (
                    <IconCheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      step.completed ? "text-emerald-100" : "text-white"
                    }`}
                  >
                    {step.label}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                      step.tagTone === "required"
                        ? "bg-red-500/15 text-red-300 ring-red-500/30"
                        : step.tagTone === "info"
                          ? "bg-accent/15 text-accent ring-accent/30"
                          : step.tagTone === "locked"
                            ? "bg-white/5 text-slate-500 ring-white/10"
                            : step.tagTone === "done"
                              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                              : "bg-slate-500/15 text-slate-400 ring-slate-500/25"
                    }`}
                  >
                    {step.tag}
                  </span>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={noop("View Setup Guide")}
            className="mt-5 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            View Setup Guide
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Tasks Overview
            </h2>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 ring-1 ring-white/15">
              {completedPct}% completed
            </span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <DonutChart
              percent={completedPct}
              color="#3B82F6"
              centerLabel={`${completedPct}%`}
              centerSub="Done"
            />
            <ul className="w-full space-y-2 text-sm">
              <LegendRow
                color="bg-slate-400"
                label="To Do"
                value={String(project.taskStats.toDo)}
              />
              <LegendRow
                color="bg-accent"
                label="In Progress"
                value={String(project.taskStats.inProgress)}
              />
              <LegendRow
                color="bg-emerald-400"
                label="Completed"
                value={String(project.taskStats.completed)}
              />
              <LegendRow
                color="bg-red-400"
                label="Overdue"
                value={String(project.taskStats.overdue)}
              />
            </ul>
          </div>
          <button
            type="button"
            onClick={noop("View All Tasks")}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-blue-400"
          >
            View All Tasks
            <IconChevron className="h-4 w-4" />
          </button>
        </section>
      </div>

      {/* Column 3 */}
      <div className="space-y-5 xl:col-span-3">
        {materialOrder ? (
          <section
            className={`rounded-2xl border p-5 ${
              materialOrder.status === "confirmed"
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-accent/30 bg-accent/10"
            }`}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
              Materials Order
            </h2>
            {materialOrder.status === "confirmed" ? (
              <>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  {materialOrder.materials_received_at
                    ? "Materials Received"
                    : "Materials Ready"}
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {formatAvailabilityLabel(
                    materialOrder.availability_date,
                    materialOrder.availability_time
                  )}
                </p>
                <p className="mt-1 text-sm text-emerald-50/90">
                  {materialOrder.branch_location || "—"}
                </p>
                <p className="mt-2 text-xs text-emerald-100/70">
                  Confirmed by {materialOrder.supplier_name || "supplier"}
                </p>
                {materialOrder.materials_received_at ? (
                  <p className="mt-2 text-xs text-emerald-200/80">
                    Received{" "}
                    {new Date(
                      materialOrder.materials_received_at
                    ).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={onMarkMaterialsReceived}
                    disabled={markReceivedBusy}
                    className="mt-4 inline-flex min-h-[40px] w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-60"
                  >
                    {markReceivedBusy
                      ? "Saving…"
                      : "Mark Materials as Received"}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent">
                  Order Sent
                </p>
                <p className="mt-2 text-sm text-slate-200">
                  Awaiting confirmation from{" "}
                  {materialOrder.supplier_name || "supplier"}.
                </p>
              </>
            )}
            <Link
              href={`/dashboard/customers/${project.customerId}/projects/${project.id}/order-materials`}
              className="mt-4 inline-flex text-sm font-semibold text-accent hover:text-blue-400"
            >
              Open Order Materials →
            </Link>
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Customer & Quote
          </h2>
          <dl className="mt-4 space-y-3">
            <DetailRow label="Customer" value={project.customerName} />
            <DetailRow
              label="Quote Status"
              value={
                <span className="font-semibold text-emerald-400">
                  {project.quoteStatus}
                </span>
              }
            />
            <DetailRow label="Accepted Date" value={project.acceptedDate} />
            <DetailRow
              label="Quote Amount"
              value={formatProjectDetailMoney(project.quoteAmount)}
            />
            <DetailRow
              label="Deposit Required"
              value={formatProjectDetailMoney(project.depositRequired)}
            />
            <DetailRow
              label="Deposit Status"
              value={
                <span className="font-semibold text-red-400">
                  {project.depositStatus}
                </span>
              }
            />
          </dl>
          <button
            type="button"
            onClick={noop("View Accepted Quote")}
            className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-blue-600"
          >
            View Accepted Quote
          </button>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Materials Overview
            </h2>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/30">
              {materialTotal} items
            </span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-4">
            <DonutChart
              percent={project.materialsReceivedPercent}
              color="#34D399"
              centerLabel={`${project.materialsReceivedPercent}%`}
              centerSub="Received"
            />
            <ul className="w-full space-y-2 text-sm">
              {materialLegend.map((row) => {
                const pct =
                  materialTotal === 0
                    ? 0
                    : Math.round((row.count / materialTotal) * 100);
                return (
                  <LegendRow
                    key={row.label}
                    color={row.color}
                    label={row.label}
                    value={`${row.count} · ${pct}%`}
                  />
                );
              })}
            </ul>
          </div>
          <button
            type="button"
            onClick={noop("View All Materials")}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-blue-400"
          >
            View All Materials
            <IconChevron className="h-4 w-4" />
          </button>
        </section>
      </div>
    </div>
  );
}

function OverviewRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-cyan-400/90">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm text-slate-200">{value}</dd>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-2 text-slate-300">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        {label}
      </span>
      <span className="font-medium text-slate-400">{value}</span>
    </li>
  );
}

function QuickAction({
  label,
  className,
  icon,
  onClick,
}: {
  label: string;
  className: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold ring-1 transition ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="flex items-center gap-2 text-slate-400">
        <IconClock className="h-4 w-4" />
        <h2 className="text-lg font-semibold text-white">{label}</h2>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        Coming soon — this tab is a placeholder for the UI shell.
      </p>
    </div>
  );
}
