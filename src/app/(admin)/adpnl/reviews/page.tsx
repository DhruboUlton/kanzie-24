import { requirePageAdmin } from "@/lib/admin-guard";
import NoAccess from "@/components/admin/NoAccess";
import ReviewsManagerClient from "@/components/admin/ReviewsManagerClient";
import { getTestimonials } from "@/lib/testimonials";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const ctx = await requirePageAdmin();

  // Both checks read the reviews permissions and nothing else. They used to
  // accept SETTINGS_* or BANNER_* as well, which let this page admit someone
  // the server actions would then refuse — and the refusal arrived as a
  // thrown error, so the page returned 500 rather than the notice below.
  if (!ctx.permissions.includes("REVIEWS_VIEW")) {
    return <NoAccess what="customer reviews and testimonials" />;
  }

  // Read straight from the source: this page has already established who is
  // asking, so going back through a server action only risks the two checks
  // disagreeing again.
  const testimonials = await getTestimonials(false);

  return (
    <ReviewsManagerClient
      initialTestimonials={testimonials}
      canManage={ctx.permissions.includes("REVIEWS_MANAGE")}
    />
  );
}
