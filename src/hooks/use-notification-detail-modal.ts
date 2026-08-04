"use client";

import { useCallback, useState } from "react";
import {
  getNotificationModalKind,
  loadMaterialSummaryForNotification,
  loadQuoteForNotification,
  type MaterialSummaryView,
  type NotificationModalKind,
} from "@/lib/notification-detail";
import { createClient } from "@/lib/supabase";
import type { AppNotification } from "@/types/notification";
import type { Quote } from "@/types/quote";

export function useNotificationDetailModal() {
  const [activeNotification, setActiveNotification] =
    useState<AppNotification | null>(null);
  const [modalKind, setModalKind] = useState<NotificationModalKind | null>(
    null
  );
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);
  const [materialSummary, setMaterialSummary] =
    useState<MaterialSummaryView | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const close = useCallback(() => {
    setActiveNotification(null);
    setModalKind(null);
    setPreviewQuote(null);
    setMaterialSummary(null);
    setIsLoadingDetail(false);
  }, []);

  const open = useCallback(async (notification: AppNotification) => {
    const kind = getNotificationModalKind(notification);
    setActiveNotification(notification);
    setModalKind(kind);
    setPreviewQuote(null);
    setMaterialSummary(null);

    if (kind === "quote") {
      setIsLoadingDetail(true);
      const supabase = createClient();
      const quote = await loadQuoteForNotification(supabase, notification);
      setPreviewQuote(quote);
      setIsLoadingDetail(false);
      return;
    }

    if (kind === "material") {
      setIsLoadingDetail(true);
      const supabase = createClient();
      const summary = await loadMaterialSummaryForNotification(
        supabase,
        notification
      );
      setMaterialSummary(summary);
      setIsLoadingDetail(false);
    }
  }, []);

  return {
    activeNotification,
    modalKind,
    previewQuote,
    materialSummary,
    isLoadingDetail,
    open,
    close,
  };
}
