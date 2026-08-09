"use client";

import { useRef, useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
} from "@/components/quotes/ui";
import {
  createCustomerDocumentSignedUrl,
  deleteCustomerDocumentFile,
  uploadCustomerDocument,
  validateCustomerDocumentFile,
} from "@/lib/customer-document-storage";
import { formatCustomerDate } from "@/lib/customer-details";
import { createClient } from "@/lib/supabase";
import type { CustomerDocument } from "@/types/customer";

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CustomerDocumentsTab({
  customerId,
  initialDocuments,
  onCountChange,
}: {
  customerId: string;
  initialDocuments: CustomerDocument[];
  onCountChange?: (count: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documents, setDocuments] =
    useState<CustomerDocument[]>(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setDocs(next: CustomerDocument[]) {
    setDocuments(next);
    onCountChange?.(next.length);
  }

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    const validationError = validateCustomerDocumentFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to upload documents.");
      setIsUploading(false);
      return;
    }

    const uploadResult = await uploadCustomerDocument({
      userId: user.id,
      customerId,
      file,
    });

    if ("error" in uploadResult) {
      setError(uploadResult.error);
      setIsUploading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("customer_documents")
      .insert({
        user_id: user.id,
        customer_id: customerId,
        file_name: file.name,
        file_path: uploadResult.path,
        file_type: file.type || null,
        file_size: file.size,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      await deleteCustomerDocumentFile(uploadResult.path);
      setError(
        insertError?.message?.includes("customer_documents")
          ? "Failed to save document. Run migration 039."
          : "Failed to save document. Please try again."
      );
      setIsUploading(false);
      return;
    }

    setDocs([data as CustomerDocument, ...documents]);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleOpen(doc: CustomerDocument) {
    setBusyId(doc.id);
    setError(null);
    const url = await createCustomerDocumentSignedUrl(doc.file_path);
    setBusyId(null);
    if (!url) {
      setError("Couldn't open that file. Try again.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(doc: CustomerDocument) {
    if (!window.confirm(`Delete “${doc.file_name}”?`)) return;

    setBusyId(doc.id);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("customer_documents")
      .delete()
      .eq("id", doc.id)
      .eq("customer_id", customerId);

    if (deleteError) {
      setError("Failed to delete document. Please try again.");
      setBusyId(null);
      return;
    }

    await deleteCustomerDocumentFile(doc.file_path);
    setDocs(documents.filter((row) => row.id !== doc.id));
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Documents ({documents.length})
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            PDFs, images, and office files up to 10 MB.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
            onChange={(event) => void handleUpload(event.target.files)}
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className={touchBtnPrimary}
          >
            {isUploading ? "Uploading…" : "Upload Document"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-sm text-slate-400">
            No documents yet. Upload contracts, photos, or site notes for this
            customer.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          {documents.map((doc) => {
            const busy = busyId === doc.id;
            return (
              <li
                key={doc.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {doc.file_name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCustomerDate(doc.uploaded_at)} ·{" "}
                    {formatFileSize(doc.file_size)}
                    {doc.file_type ? ` · ${doc.file_type}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleOpen(doc)}
                    className={touchBtnSecondary}
                  >
                    {busy ? "…" : "Open"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleDelete(doc)}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
