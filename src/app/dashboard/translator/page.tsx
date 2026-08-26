import type { Metadata } from "next";
import { TranslatorPage } from "@/components/translator/translator-page";

export const metadata: Metadata = {
  title: "Video & Audio Translator",
};

export default function DashboardTranslatorRoute() {
  return <TranslatorPage />;
}
