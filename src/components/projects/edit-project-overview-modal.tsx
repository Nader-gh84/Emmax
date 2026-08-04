"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchInput,
  touchTextarea,
} from "@/components/quotes/ui";

export interface ProjectOverviewFormData {
  description: string;
  address: string;
  projectType: string;
  projectManager: string;
}

export function EditProjectOverviewModal({
  customerId,
  customerName,
  internalProjectNumber,
  initialForm,
  isSaving,
  onClose,
  onSave,
}: {
  customerId: string;
  customerName: string;
  internalProjectNumber: string;
  initialForm: ProjectOverviewFormData;
  isSaving: boolean;
  onClose: () => void;
  onSave: (form: ProjectOverviewFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<ProjectOverviewFormData>(initialForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm);
    setError(null);
    // Sync when parent opens modal with a fresh project snapshot — compare
    // field values so a new object identity alone does not wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional field deps
  }, [
    initialForm.description,
    initialForm.address,
    initialForm.projectType,
    initialForm.projectManager,
  ]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  function updateField(key: keyof ProjectOverviewFormData, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!form.projectType.trim()) {
      setError("Project type is required.");
      return;
    }
    if (!form.projectManager.trim()) {
      setError("Project manager is required.");
      return;
    }

    try {
      await onSave({
        description: form.description.trim(),
        address: form.address.trim(),
        projectType: form.projectType.trim(),
        projectManager: form.projectManager.trim(),
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save project overview."
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!isSaving) onClose();
        }}
      />
      <div
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-navy p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-project-overview-title"
      >
        <h2
          id="edit-project-overview-title"
          className="text-xl font-semibold text-white"
        >
          Edit Project Overview
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Update the overview details for this project.
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="project-overview-description"
              className="block text-base font-medium text-slate-300"
            >
              Description <span className="text-accent">*</span>
            </label>
            <textarea
              id="project-overview-description"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              className={`${touchTextarea} mt-1.5 min-h-[120px]`}
              placeholder="Describe the project scope and goals"
            />
          </div>

          <div>
            <span className="block text-base font-medium text-slate-300">
              Customer
            </span>
            <div className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Link
                href={`/dashboard/customers/${customerId}`}
                className="text-sm font-medium text-accent hover:text-blue-400"
              >
                {customerName}
              </Link>
              <p className="mt-1 text-xs text-slate-500">
                Customer assignment is read-only. Open the customer profile to
                edit contact details.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="project-overview-address"
              className="block text-base font-medium text-slate-300"
            >
              Address
            </label>
            <input
              id="project-overview-address"
              type="text"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              className={`${touchInput} mt-1.5`}
              placeholder="Job site address"
              autoComplete="street-address"
            />
          </div>

          <div>
            <label
              htmlFor="project-overview-type"
              className="block text-base font-medium text-slate-300"
            >
              Project Type <span className="text-accent">*</span>
            </label>
            <input
              id="project-overview-type"
              type="text"
              value={form.projectType}
              onChange={(event) =>
                updateField("projectType", event.target.value)
              }
              className={`${touchInput} mt-1.5`}
              placeholder="e.g. Residential Renovation"
            />
          </div>

          <div>
            <label
              htmlFor="project-overview-manager"
              className="block text-base font-medium text-slate-300"
            >
              Project Manager <span className="text-accent">*</span>
            </label>
            <input
              id="project-overview-manager"
              type="text"
              value={form.projectManager}
              onChange={(event) =>
                updateField("projectManager", event.target.value)
              }
              className={`${touchInput} mt-1.5`}
              placeholder="Assigned manager"
            />
          </div>

          <div>
            <span className="block text-base font-medium text-slate-300">
              Internal Project #
            </span>
            <div className="mt-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-sm text-slate-300">
              {internalProjectNumber}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Auto-generated from the linked quote and cannot be edited here.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className={`${touchBtnSecondary} w-full sm:w-auto`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`${touchBtnPrimary} w-full sm:w-auto`}
            >
              {isSaving ? "Saving..." : "Save Overview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
