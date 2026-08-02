import type { Metadata } from "next";
import { OrderMaterialsPage } from "@/components/projects/order-materials-page";
import { getMockOrderMaterials } from "@/lib/order-materials-mock";

export const metadata: Metadata = {
  title: "Order Materials",
};

export default function OrderMaterialsRoute({
  params,
}: {
  params: { id: string; projectId: string };
}) {
  // UI-only shell: kitchen renovation mock for visual review.
  const order = getMockOrderMaterials(params.id, params.projectId);

  return <OrderMaterialsPage order={order} />;
}
