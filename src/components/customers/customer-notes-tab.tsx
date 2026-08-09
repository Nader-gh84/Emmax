"use client";

import { useState } from "react";
import {
  touchBtnPrimary,
  touchBtnSecondary,
  touchTextarea,
} from "@/components/quotes/ui";
import { formatCustomerDate } from "@/lib/customer-details";
import { createClient } from "@/lib/supabase";
import type { CustomerNote } from "@/types/customer";

export function CustomerNotesTab({
  customerId,
  initialNotes,
  onNotesChange,
}: {
  customerId: string;
  initialNotes: CustomerNote[];
  onNotesChange?: (notes: CustomerNote[]) => void;
}) {
  const [notes, setNotes] = useState<CustomerNote[]>(initialNotes);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function commit(next: CustomerNote[]) {
    setNotes(next);
    onNotesChange?.(next);
  }

  async function handleAdd() {
    const text = draft.trim();
    if (!text || isSaving) return;

    setIsSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to add notes.");
      setIsSaving(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("customer_notes")
      .insert({
        user_id: user.id,
        customer_id: customerId,
        note_text: text,
      })
      .select("*")
      .single();

    if (insertError || !data) {
      setError(
        insertError?.message?.includes("customer_notes")
          ? "Failed to add note. Run migration 039."
          : "Failed to add note. Please try again."
      );
      setIsSaving(false);
      return;
    }

    commit([data as CustomerNote, ...notes]);
    setDraft("");
    setIsSaving(false);
  }

  async function handleSaveEdit(noteId: string) {
    const text = editText.trim();
    if (!text) return;

    setBusyId(noteId);
    setError(null);
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("customer_notes")
      .update({ note_text: text })
      .eq("id", noteId)
      .eq("customer_id", customerId)
      .select("*")
      .single();

    if (updateError || !data) {
      setError("Failed to update note. Please try again.");
      setBusyId(null);
      return;
    }

    commit(
      notes.map((note) => (note.id === noteId ? (data as CustomerNote) : note))
    );
    setEditingId(null);
    setEditText("");
    setBusyId(null);
  }

  async function handleDelete(noteId: string) {
    if (!window.confirm("Delete this note?")) return;

    setBusyId(noteId);
    setError(null);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("customer_notes")
      .delete()
      .eq("id", noteId)
      .eq("customer_id", customerId);

    if (deleteError) {
      setError("Failed to delete note. Please try again.");
      setBusyId(null);
      return;
    }

    commit(notes.filter((note) => note.id !== noteId));
    if (editingId === noteId) {
      setEditingId(null);
      setEditText("");
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Notes ({notes.length})
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Keep site access details, preferences, and follow-ups here.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={`${touchTextarea} min-h-[96px]`}
          placeholder="Add a note…"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={isSaving || !draft.trim()}
            onClick={() => void handleAdd()}
            className={touchBtnPrimary}
          >
            {isSaving ? "Saving…" : "Add Note"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="text-sm text-slate-400">No notes yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => {
            const busy = busyId === note.id;
            const editing = editingId === note.id;
            return (
              <li
                key={note.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-medium text-slate-500">
                    {formatCustomerDate(note.created_at)}
                  </p>
                  {!editing ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(note.id);
                          setEditText(note.note_text);
                        }}
                        className="text-xs font-semibold text-accent hover:text-blue-400"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDelete(note.id)}
                        className="text-xs font-semibold text-red-300 hover:text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {editing ? (
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={editText}
                      onChange={(event) => setEditText(event.target.value)}
                      className={`${touchTextarea} min-h-[96px]`}
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                        className={touchBtnSecondary}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busy || !editText.trim()}
                        onClick={() => void handleSaveEdit(note.id)}
                        className={touchBtnPrimary}
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                    {note.note_text}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
