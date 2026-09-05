import NoAccess from "@/components/admin/NoAccess";
import { requirePageAccess } from "@/lib/admin-guard";
import { getCouponUsageHistory } from "@/lib/coupons";
import CouponUsageHistoryClient from "@/components/admin/coupons/CouponUsageHistoryClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/** Parses a yyyy-mm-dd input value; `endOfDay` makes the range inclusive. */
function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(endOfDay ? `${value}T23:59:59.999` : `${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export default async function AdminCouponUsagePage(props: {
  searchParams: Promise<{
    q?: string;
    coupon?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { allowed } = await requirePageAccess("COUPONS_VIEW");
  if (!allowed) return <NoAccess what="coupons" />;

  const { q, coupon, status, from, to, page } = await props.searchParams;
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);

  // Searching and paging happen in the database: the redemption log grows
  // without limit, so filtering whichever rows happened to be sent would go
  // quietly wrong the moment it outgrew one page.
  const { usages, total, error } = await getCouponUsageHistory({
    search: q,
    couponId: coupon,
    orderStatus: status && status !== "all" ? status : undefined,
    dateFrom: parseDate(from),
    dateTo: parseDate(to, true),
    limit: PAGE_SIZE,
    skip: (currentPage - 1) * PAGE_SIZE,
  });

  return (
    <CouponUsageHistoryClient
      usages={usages}
      total={total}
      page={currentPage}
      pageSize={PAGE_SIZE}
      filters={{
        q: q ?? "",
        coupon: coupon ?? "",
        status: status ?? "all",
        from: from ?? "",
        to: to ?? "",
      }}
      loadError={error ?? null}
    />
  );
}
