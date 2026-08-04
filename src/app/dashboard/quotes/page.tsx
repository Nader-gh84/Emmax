import type { Metadata } from "next";
import { PreInvoicesDashboard } from "@/components/quotes/pre-invoices-dashboard";

export const metadata: Metadata = {
  title: "Projects",
};

export default function PreInvoicesPage() {
  return <PreInvoicesDashboard />;
}
