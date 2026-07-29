import type { Metadata } from "next";
import { InboxPage } from "@/components/dashboard/inbox-page";

export const metadata: Metadata = {
  title: "Inbox",
};

export default function DashboardInboxRoute() {
  return <InboxPage />;
}
