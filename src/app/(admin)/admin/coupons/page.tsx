import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { isOwner } from "@/lib/permissions";
import { getCouponDashboardMetrics, getCouponList } from "@/lib/coupons";
import CouponDashboardClient from "@/components/admin/coupons/CouponDashboardClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminCouponsPage(props: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }>;
}) {
  const { ctx, allowed } = await requirePageAccess("COUPONS_VIEW");
  if (!allowed) return <NoAccess what="coupons" />;

  // Search and paging run in the database rather than in the browser: a batch
  // can be 500 coupons, and filtering only the rows that happened to be sent
  // meant a code past the first page simply could not be found.
  const { q, status, type, page } = await props.searchParams;
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  const [metrics, list] = await Promise.all([
    getCouponDashboardMetrics(),
    getCouponList({
      search: q,
      status,
      discountType: type,
      limit: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    }),
  ]);

  return (
    <CouponDashboardClient
      metrics={metrics}
      coupons={list.coupons}
      total={list.total}
      page={currentPage}
      pageSize={PAGE_SIZE}
      filters={{ q: q ?? "", status: status ?? "all", type: type ?? "all" }}
      loadError={list.error ?? metrics.error ?? null}
      isOwner={isOwner(ctx)}
      canManage={ctx.permissions.includes("COUPONS_MANAGE")}
    />
  );
}
