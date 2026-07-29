"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { AppNotification } from "@/types/notification";

/**
 * Shared unread notification tracking for the bell and Inbox nav badge.
 * Same source (notifications table), realtime + 30s poll.
 */
export function useUnreadNotifications(limit = 20) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    const items = (data as AppNotification[]) ?? [];
    setNotifications(items);
    setUnreadCount(items.filter((item) => !item.read).length);
  }, [limit]);

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
        .channel(`unread-notifications-${user.id}-${limit}`)
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

    const pollInterval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      window.clearInterval(pollInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadNotifications, limit]);

  return {
    notifications,
    unreadCount,
    setNotifications,
    setUnreadCount,
    refresh: loadNotifications,
  };
}
