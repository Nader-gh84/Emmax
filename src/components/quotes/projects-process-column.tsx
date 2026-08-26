"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "@/components/quotes/projects-page.module.css";
import {
  PRE_INVOICE_WORKFLOW_STEPS,
  type ProjectWorkflowStep,
  type WorkflowStepId,
} from "@/lib/pre-invoices";

const ICON_CLASS: Record<WorkflowStepId, string> = {
  voice_materials: styles.iconMic,
  send_supplier: styles.iconTruck,
  upload_prices: styles.iconUpload,
  create_quote: styles.iconDoc,
  send_customer: styles.iconSend,
  customer_accept: styles.iconCheck,
  order_materials: styles.iconCart,
  materials_ready: styles.iconBox,
  schedule_project: styles.iconCal,
  start_project: styles.iconPlay,
};

function StepGlyph({ id }: { id: WorkflowStepId }) {
  switch (id) {
    case "voice_materials":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "send_supplier":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M2.5 6.5h10v9h-10v-9ZM12.5 9.5h4l3 3.2v2.8h-7v-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="6" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="16.5" cy="17.5" r="1.9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "upload_prices":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M6.5 18a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6-1.3A4.3 4.3 0 0 1 18 18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 20.5v-8m0 0-2.6 2.6M12 12.5l2.6 2.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "create_quote":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5.5 2.5h8L18.5 7.5v14h-13v-19Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M13.5 2.5v5h5M8.5 12.5h7M8.5 16h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "send_customer":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "customer_accept":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="m7.8 12.2 2.7 2.7 5.5-5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "order_materials":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M2.5 3.5h2.8l2.4 11h9.6l2.2-8H6.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="19" r="1.6" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17" cy="19" r="1.6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "materials_ready":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3 8.5v7L12 20l9-4.5v-7M12 13v7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "schedule_project":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "start_project":
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 8.5v7l5.5-3.5L10 8.5Z" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

function tagForStep(
  state: ProjectWorkflowStep["state"],
  actionable: boolean,
  interactive: boolean
): { label: string; className: string } {
  if (state === "completed") {
    return { label: "Done", className: `${styles.tag} ${styles.tagDone}` };
  }
  if (state === "active") {
    // Unselected "new project" ladder must not look like a real project's Current step.
    if (!interactive) {
      return { label: "Start", className: `${styles.tag} ${styles.tagActive}` };
    }
    if (actionable) {
      return { label: "Current", className: `${styles.tag} ${styles.tagActive}` };
    }
    return { label: "Waiting", className: `${styles.tag} ${styles.tagWaiting}` };
  }
  return { label: "Pending", className: styles.tag };
}

export function newProjectWorkflowSteps(): ProjectWorkflowStep[] {
  return PRE_INVOICE_WORKFLOW_STEPS.map((step) => ({
    id: step.id,
    state: step.number === 1 ? "active" : "locked",
    completedDate: null,
    actionLabel: step.number === 1 ? "Record" : null,
  }));
}

export function ProjectsProcessColumn({
  projectTitle,
  projectNumber,
  statusLabel,
  nextActionText,
  steps,
  busy,
  interactive,
  onStepAction,
}: {
  projectTitle: string;
  projectNumber?: string | null;
  statusLabel?: string | null;
  nextActionText?: string | null;
  steps: ProjectWorkflowStep[];
  busy: boolean;
  interactive: boolean;
  onStepAction: (stepId: WorkflowStepId) => void;
}) {
  const heading = projectTitle.trim() || "New project";
  const waitingCopy = nextActionText?.trim() || null;
  const activeStepRef = useRef<HTMLDivElement | null>(null);

  // Canonical lookup by step id — never trust array index alignment.
  const stepById = useMemo(() => {
    const map = new Map<WorkflowStepId, ProjectWorkflowStep>();
    for (const step of steps) {
      map.set(step.id, step);
    }
    return map;
  }, [steps]);

  const activeStepId =
    steps.find((step) => step.state === "active")?.id ?? null;

  useEffect(() => {
    if (!interactive || !activeStepId) return;
    activeStepRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [interactive, activeStepId, projectNumber, statusLabel]);

  return (
    <section className={`${styles.card} ${styles.process}`}>
      <p className={styles.processEyebrow}>Project process</p>
      <h2>{heading}</h2>
      {interactive ? (
        <div className={styles.processMeta}>
          {projectNumber?.trim() ? (
            <span className={styles.processNumber}>{projectNumber.trim()}</span>
          ) : null}
          {statusLabel?.trim() ? (
            <span className={`${styles.tag} ${styles.tagActive}`}>
              {statusLabel.trim()}
            </span>
          ) : null}
        </div>
      ) : (
        <p className={styles.sub}>Follow these simple steps from start to finish.</p>
      )}
      {interactive && waitingCopy ? (
        <p className={styles.processNext}>{waitingCopy}</p>
      ) : null}

      <div className={styles.steps}>
        {PRE_INVOICE_WORKFLOW_STEPS.map((definition) => {
          const step = stepById.get(definition.id) ?? {
            id: definition.id,
            state: "locked" as const,
            actionLabel: null,
          };
          const isActive = step.state === "active";
          const actionLabel = step.actionLabel?.trim() || null;
          const actionable =
            interactive && isActive && Boolean(actionLabel) && !busy;
          const tag = tagForStep(step.state, Boolean(actionLabel), interactive);
          const stepClass =
            step.state === "completed"
              ? `${styles.step} ${styles.stepDone}`
              : isActive
                ? `${styles.step} ${styles.stepActive}`
                : styles.step;

          return (
            <div
              key={definition.id}
              className={stepClass}
              ref={isActive ? activeStepRef : undefined}
              data-step-id={definition.id}
              data-step-state={step.state}
            >
              <div className={styles.stepRail}>
                <span className={styles.stepNum}>{definition.number}</span>
              </div>
              <div className={styles.stepBody}>
                <span className={`${styles.stepIcon} ${ICON_CLASS[definition.id]}`}>
                  <StepGlyph id={definition.id} />
                </span>
                <div className={styles.stepText}>
                  <h4>{definition.title}</h4>
                  <p>{definition.description}</p>
                  {actionable ? (
                    <button
                      type="button"
                      className={styles.stepCta}
                      disabled={busy}
                      onClick={() => onStepAction(definition.id)}
                    >
                      {actionLabel}
                    </button>
                  ) : null}
                  {isActive && !actionLabel && interactive && waitingCopy ? (
                    <p className={styles.stepWaiting}>{waitingCopy}</p>
                  ) : null}
                </div>
                <span className={tag.className}>{tag.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.emaNote}>
        <span className={styles.spark} aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path
              d="M10 1.8 11.4 6.4 16 7.8l-4.6 1.4L10 13.8 8.6 9.2 4 7.8l4.6-1.4L10 1.8Z"
              fill="currentColor"
            />
            <path
              d="M16 12.8l.5 1.9 1.8.5-1.8.5-.5 1.9-.5-1.9-1.8-.5 1.8-.5.5-1.9Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <p>Ema will guide you at every step and keep everything organized.</p>
      </div>
    </section>
  );
}
