"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  deleteProductAction,
  getProductDeletionImpact,
} from "@/lib/actions/product";

// Deletion is the one product action that cannot be undone, so the dialog
// waits for the real numbers before it will let the button be pressed: how
// many orders sold this product, and how many files are about to go with it.
// Archiving is one click; this one has to be worth the extra second.
export default function ProductDeleteButton({
  productId,
  productName,
  compact = false,
}: {
  productId: string;
  productName: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<{
    orderCount: number;
    soldQty: number;
    mediaCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function openDialog() {
    setOpen(true);
    setError(null);
    setImpact(null);
    setLoading(true);
    const res = await getProductDeletionImpact(productId);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Couldn't check this product.");
      return;
    }
    setImpact({
      orderCount: res.orderCount ?? 0,
      soldQty: res.soldQty ?? 0,
      mediaCount: res.mediaCount ?? 0,
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteProductAction(productId);
      if (!res.success) {
        setError(res.error || "Couldn't delete that product.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        title="Delete permanently"
        className={
          compact
            ? "p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            : "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        }
      >
        <Trash2 className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      </button>

      {open && (
        <ConfirmDialog
          title={`Delete ${productName}?`}
          body={
            error
              ? error
              : loading || !impact
                ? "Checking what this product is attached to…"
                : describeImpact(impact)
          }
          confirmLabel={
            error ? "Unavailable" : pending ? "Deleting…" : "Delete permanently"
          }
          busy={pending || loading || !impact || Boolean(error)}
          onCancel={() => !pending && setOpen(false)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

function describeImpact(impact: {
  orderCount: number;
  soldQty: number;
  mediaCount: number;
}): string {
  const parts: string[] = [];

  if (impact.orderCount > 0) {
    parts.push(
      `It sold ${impact.soldQty} ${impact.soldQty === 1 ? "unit" : "units"} across ${impact.orderCount} ${
        impact.orderCount === 1 ? "order" : "orders"
      }. Those orders keep their totals and will show that you deleted this product.`,
    );
  }

  if (impact.mediaCount > 0) {
    parts.push(
      `${impact.mediaCount} attached ${impact.mediaCount === 1 ? "photo/video" : "photos/videos"} stay in the Media Library and are not deleted.`,
    );
  }

  parts.push("Its stock history goes too. This cannot be undone — archive instead to keep it.");
  return parts.join(" ");
}
