import type { Metadata } from "next";
import { Suspense } from "react";
import { PreInvoicesDashboard } from "@/components/quotes/pre-invoices-dashboard";

export const metadata: Metadata = {
  title: "Projects",
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <PreInvoicesDashboard />
    </Suspense>
  );
}
