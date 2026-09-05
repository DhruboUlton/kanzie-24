import { notFound } from "next/navigation";
import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getCouponById } from "@/lib/coupons";
import CouponDetailClient from "@/components/admin/coupons/CouponDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminCouponDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { ctx, allowed } = await requirePageAccess("COUPONS_VIEW");
  if (!allowed) return <NoAccess what="coupons" />;

  const { id } = await props.params;

  const USAGE_ROWS = 100;
  const { coupon, usages, usageTotal } = await getCouponById(id, USAGE_ROWS);
  if (!coupon) {
    notFound();
  }

  const canManage = ctx.permissions.includes("COUPONS_MANAGE");

  return (
    <CouponDetailClient
      coupon={coupon}
      usages={usages}
      usageTotal={usageTotal}
      canManage={canManage}
    />
  );
}
