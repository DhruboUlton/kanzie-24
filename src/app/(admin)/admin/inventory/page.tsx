import InventoryClient from "@/components/admin/InventoryClient";
import { getInventory, getStockMovements } from "@/lib/inventory";
import type {
  InventoryRow,
  InventorySummary,
  StockMovementRow,
} from "@/lib/inventory-shared";

export const dynamic = "force-dynamic";

const EMPTY_SUMMARY: InventorySummary = {
  skuCount: 0,
  unitCount: 0,
  retailValueCents: 0,
  costValueCents: 0,
  costKnownCount: 0,
  lowCount: 0,
  outCount: 0,
  oversoldCount: 0,
  committedUnits: 0,
};

export default async function InventoryPage() {
  let rows: InventoryRow[] = [];
  let summary = EMPTY_SUMMARY;
  let threshold = 5;
  let movements: StockMovementRow[] = [];

  // A database hiccup should render an empty inventory screen, not a 500 —
  // same fallback posture as the rest of the admin.
  try {
    const [inventory, recent] = await Promise.all([
      getInventory(),
      getStockMovements({ limit: 100 }),
    ]);
    rows = inventory.rows;
    summary = inventory.summary;
    threshold = inventory.threshold;
    movements = recent;
  } catch (error) {
    console.warn("Inventory page DB fallback:", error);
  }

  return (
    <InventoryClient
      rows={rows}
      summary={summary}
      threshold={threshold}
      movements={movements}
    />
  );
}
