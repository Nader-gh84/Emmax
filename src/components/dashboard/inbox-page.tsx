"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconCheckCircle,
  IconClock,
  IconDocumentDraft,
  IconInbox,
  IconTrash,
  IconTruck,
  IconXCircle,
} from "@/components/dashboard/icons";
import { NotificationDetailModals } from "@/components/dashboard/notification-detail-modals";
import { touchBtnPrimary, touchBtnSecondary } from "@/components/quotes/ui";
import { useNotificationDetailModal } from "@/hooks/use-notification-detail-modal";
import { createClient } from "@/lib/supabase";
import {
  type AppNotification,
  formatNotificationTime,
  groupNotificationsByDay,
} from "@/types/notification";

function NotificationTypeIcon({ type }: { type: string }) {
  const className = "h-5 w-5";

  switch (type) {
    case "draft_quote":
      return <IconDocumentDraft className={className} />;
    case "quote_accepted":
      return <IconCheckCircle className={className} />;
    case "quote_declined":
      return <IconXCircle className={className} />;
    case "supplier_price":
      return <IconTruck className={className} />;
    case "materials_confirmed":
      return <IconCheckCircle className={className} />;
    case "employee_clock":
      return <IconClock className={className} />;
    default:
      return <IconInbox className={className} />;
  }
}

function typeAccent(type: string) {
  switch (type) {
    case "draft_quote":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    case "quote_accepted":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "quote_declined":
      return "bg-red-500/15 text-red-300 ring-red-500/30";
    case "supplier_price":
      return "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30";
    case "materials_confirmed":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "employee_clock":
      return "bg-blue-500/15 text-blue-300 ring-blue-500/30";
    default:
      return "bg-white/10 text-slate-300 ring-white/15";
  }
}

export function InboxPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const notificationDetail = useNotificationDetailModal();

  const loadNotifications = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError("Failed to load inbox. Please try again.");
      setIsLoading(false);
      return;
    }

    setNotifications((data as AppNotification[]) ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications();

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setupRealtime() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`inbox-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadNotifications();
          }
        )
        .subscribe();
    }

    void setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications]);

  const groups = useMemo(
    () => groupNotificationsByDay(notifications),
    [notifications]
  );

  useEffect(() => {
    setSelectedIds((current) => {
      if (current.size === 0) return current;
      const validIds = new Set(notifications.map((item) => item.id));
      const next = new Set(
        Array.from(current).filter((id) => validIds.has(id))
      );
      return next.size === current.size ? current : next;
    });

    if (notifications.length === 0 && isSelectionMode) {
      setIsSelectionMode(false);
    }
  }, [notifications, isSelectionMode]);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const selectedCount = selectedIds.size;

  function enterSelectionMode() {
    setIsSelectionMode(true);
    setSelectedIds(new Set());
    setError(null);
  }

  function exitSelectionMode() {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function markAsRead(notification: AppNotification) {
    if (notification.read) return;

    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );
  }

  async function handleOpenNotification(notification: AppNotification) {
    void markAsRead(notification);
    setError(null);
    await notificationDetail.open(notification);
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return;
    setIsMarkingAll(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (updateError) {
        setError("Failed to mark all as read.");
        return;
      }

      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true }))
      );
    } finally {
      setIsMarkingAll(false);
    }
  }

  async function handleDelete(notification: AppNotification) {
    const confirmed = window.confirm(
      "Delete this notification? This cannot be undone."
    );
    if (!confirmed) return;
    if (deletingIds.has(notification.id)) return;

    setError(null);
    setDeletingIds((current) => new Set(current).add(notification.id));

    const previous = notifications;
    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id)
    );
    setSelectedIds((current) => {
      if (!current.has(notification.id)) return current;
      const next = new Set(current);
      next.delete(notification.id);
      return next;
    });

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notification.id);

    if (deleteError) {
      setNotifications(previous);
      setError("Failed to delete notification. Please try again.");
    }

    setDeletingIds((current) => {
      const next = new Set(current);
      next.delete(notification.id);
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedCount === 0 || isBulkDeleting) return;

    const confirmed = window.confirm(
      `Delete ${selectedCount} notification${selectedCount === 1 ? "" : "s"}? This cannot be undone.`
    );
    if (!confirmed) return;

    const ids = Array.from(selectedIds);
    setError(null);
    setIsBulkDeleting(true);

    const previous = notifications;
    setNotifications((current) =>
      current.filter((item) => !selectedIds.has(item.id))
    );

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .in("id", ids);

    if (deleteError) {
      setNotifications(previous);
      setError("Failed to delete selected notifications. Please try again.");
      setIsBulkDeleting(false);
      return;
    }

    exitSelectionMode();
    setIsBulkDeleting(false);
  }

  return (
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Inbox
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Drafts, confirmations, and other updates in one place.
          </p>
        </div>

        {isSelectionMode ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="mr-1 text-sm font-medium text-slate-300">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={() => void handleBulkDelete()}
              disabled={selectedCount === 0 || isBulkDeleting}
              className={`${touchBtnPrimary} gap-2 bg-red-600 px-4 text-sm hover:bg-red-500 disabled:opacity-40`}
            >
              <IconTrash className="h-4 w-4" />
              {isBulkDeleting ? "Deleting…" : "Delete Selected"}
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              disabled={isBulkDeleting}
              className={`${touchBtnSecondary} px-4 text-sm`}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              type="button"
              onClick={enterSelectionMode}
              disabled={notifications.length === 0 || isLoading}
              className={`${touchBtnSecondary} px-4 text-sm disabled:opacity-40`}
            >
              Select
            </button>
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0 || isMarkingAll}
              className={`${touchBtnSecondary} px-4 text-sm disabled:opacity-40`}
            >
              {isMarkingAll ? "Marking…" : "Mark all as read"}
            </button>
          </div>
        )}
      </header>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="mt-10 flex items-center gap-3 text-sm text-slate-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
          Loading inbox…
        </div>
      ) : notifications.length === 0 ? (
        <div className="mt-12 flex flex-col items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/30">
            <IconInbox className="h-10 w-10 text-accent" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
            No notifications
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
            Save a draft pre-invoice or wait for a customer confirmation — updates
            will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                {group.items.map((notification) => {
                  const isDeleting = deletingIds.has(notification.id);
                  const isSelected = selectedIds.has(notification.id);
                  const mainClass = `flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left transition hover:bg-white/[0.04] ${
                    notification.read ? "opacity-80" : ""
                  } ${isSelected ? "bg-accent/5" : ""}`;

                  const body = (
                    <>
                      <span
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${typeAccent(
                          notification.type
                        )}`}
                      >
                        <NotificationTypeIcon type={notification.type} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span
                            className={`text-sm leading-snug ${
                              notification.read
                                ? "font-medium text-slate-300"
                                : "font-semibold text-white"
                            }`}
                          >
                            {notification.message}
                          </span>
                          {!notification.read && (
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
                              aria-label="Unread"
                            />
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {formatNotificationTime(notification.created_at)}
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li
                      key={notification.id}
                      className="group flex items-stretch border-b border-white/5 last:border-b-0"
                    >
                      {isSelectionMode && (
                        <label className="flex shrink-0 cursor-pointer items-center pl-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(notification.id)}
                            className="h-4 w-4 rounded border-white/30 bg-white/5 text-accent focus:ring-accent focus:ring-offset-0"
                            aria-label={`Select notification: ${notification.message}`}
                          />
                        </label>
                      )}

                      {isSelectionMode ? (
                        <button
                          type="button"
                          onClick={() => toggleSelected(notification.id)}
                          className={mainClass}
                        >
                          {body}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            void handleOpenNotification(notification)
                          }
                          className={mainClass}
                        >
                          {body}
                        </button>
                      )}

                      {!isSelectionMode && (
                        <div className="flex shrink-0 items-center pr-3">
                          <button
                            type="button"
                            aria-label="Delete notification"
                            disabled={isDeleting}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void handleDelete(notification);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 opacity-100 transition hover:bg-red-500/15 hover:text-red-300 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <NotificationDetailModals
        activeNotification={notificationDetail.activeNotification}
        modalKind={notificationDetail.modalKind}
        previewQuote={notificationDetail.previewQuote}
        materialSummary={notificationDetail.materialSummary}
        isLoadingDetail={notificationDetail.isLoadingDetail}
        onClose={notificationDetail.close}
      />
    </main>
  );
}
