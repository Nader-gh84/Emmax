"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { IconBell } from "@/components/dashboard/icons";
import { NotificationDetailModals } from "@/components/dashboard/notification-detail-modals";
import { UnreadCountBadge } from "@/components/dashboard/unread-count-badge";
import { useNotificationDetailModal } from "@/hooks/use-notification-detail-modal";
import { useUnreadNotifications } from "@/hooks/use-unread-notifications";
import { createClient } from "@/lib/supabase";
import {
  type AppNotification,
  formatNotificationTime,
} from "@/types/notification";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    setNotifications,
    setUnreadCount,
  } = useUnreadNotifications(20);
  const [isOpen, setIsOpen] = useState(false);
  const notificationDetail = useNotificationDetailModal();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpenNotification(notification: AppNotification) {
    if (!notification.read) {
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
      setUnreadCount((count) => Math.max(0, count - 1));
    }

    setIsOpen(false);
    await notificationDetail.open(notification);
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-slate-300 transition hover:bg-white/10 hover:text-white"
          aria-label="Notifications"
        >
          <IconBell className="h-5 w-5" />
          <UnreadCountBadge
            count={unreadCount}
            className="absolute -right-1 -top-1"
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-navy shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-semibold text-white">Notifications</p>
              <Link
                href="/dashboard/inbox"
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-accent hover:text-blue-400"
              >
                Open Inbox
              </Link>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-400">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleOpenNotification(notification)}
                    className="block w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    <p
                      className={`text-sm leading-snug ${
                        notification.read ? "text-slate-400" : "text-white"
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatNotificationTime(notification.created_at)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <NotificationDetailModals
        activeNotification={notificationDetail.activeNotification}
        modalKind={notificationDetail.modalKind}
        previewQuote={notificationDetail.previewQuote}
        materialSummary={notificationDetail.materialSummary}
        isLoadingDetail={notificationDetail.isLoadingDetail}
        onClose={notificationDetail.close}
      />
    </>
  );
}
