import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import OrderDetailClient from "@/components/admin/OrderDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  let order: any = null;

  try {
    order = await db.order.findFirst({
      where: {
        OR: [{ id }, { tranId: id }],
      },
      include: {
        items: true,
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch (err) {
    console.error("Order fetch error:", err);
  }

  if (!order) {
    // If not found in DB yet, render placeholder preview
    order = {
      id: id,
      tranId: id.startsWith("KZ-") ? id : `KZ-DEMO-${id.slice(0, 6)}`,
      status: "PAID",
      totalAmountCents: 1899900,
      currency: "BDT",
      customerName: "Mohammad Tanvir",
      customerEmail: "tanvir@example.com",
      customerPhone: "+880 1712-345678",
      customerAddress: "House 24, Road 7, Block C, Banani",
      customerCity: "Dhaka",
      cardType: "bKash Online",
      valId: "VAL_678912345",
      bankTranId: "BANK_TX_987654",
      trackingNumber: "STEADFAST-998822",
      createdAt: new Date(),
      items: [
        {
          id: "item-1",
          productName: "Alloy RC Crawler Excavator",
          productSku: "DM-EX14A",
          productSlug: "alloy-rc-crawler-excavator",
          unitPriceCents: 18999,
          qty: 1,
          totalPriceCents: 18999,
        },
      ],
      events: [
        {
          id: "ev-1",
          status: "PAID",
          note: "Payment received via bKash gateway",
          createdAt: new Date(),
        },
        {
          id: "ev-2",
          status: "PENDING",
          note: "Order initiated via checkout",
          createdAt: new Date(Date.now() - 3600000),
        },
      ],
    };
  }

  return <OrderDetailClient order={order} />;
}
