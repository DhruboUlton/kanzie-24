"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  FolderTree,
  CornerDownRight,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import {
  createCategoryAction,
  updateCategoryAction,
  setCategoryHomepageAction,
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/lib/actions/category";
import ImageField from "@/components/admin/ImageField";

// Where a category sits is decided by dragging it, not by typing a number
// into a box. Two things follow from that:
//
//  - The list is held in local state and moves immediately, then saves. A
//    drag that waits for a round trip before it moves feels broken.
//  - Up/down buttons do the same job. Native HTML5 drag events don't fire
//    on touch at all, and this admin gets used on a phone.

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder?: number | null;
  parentId?: string | null;
  imageUrl?: string | null;
  showOnHomepage?: boolean;
};

function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export default function CategoryManagerClient({
  categories,
}: {
  categories: CategoryRow[];
}) {
  const router = useRouter();
  // Mirrors the server list so a drag can move a row at once instead of
  // waiting for a round trip. Re-synced by comparing the prop against the
  // last one seen, during render — an effect that calls setItems would run
  // on every render, because the server hands down a fresh array each time.
  const [items, setItems] = useState<CategoryRow[]>(categories);
  const [seenCategories, setSeenCategories] = useState(categories);
  if (seenCategories !== categories) {
    setSeenCategories(categories);
    setItems(categories);
  }

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [parentId, setParentId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nesting is one level deep, so only categories that aren't already a
  // subcategory can be picked as a parent.
  const parentOptions = items.filter(
    (c) => c.id && !c.parentId && c.id !== editingId,
  );

  const byOrder = (a: CategoryRow, b: CategoryRow) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  // Group key: "" for the top level, the parent's id for a subcategory. A
  // drag only ever reorders within one of these.
  const groupOf = (cat: Pick<CategoryRow, "parentId">) => cat.parentId ?? "";
  const groupIds = (key: string) =>
    items.filter((c) => groupOf(c) === key).sort(byOrder).map((c) => c.id);

  // Parents first, each immediately followed by its own subcategories.
  const orderedRows: { cat: CategoryRow; isChild: boolean }[] = [];
  for (const parent of items.filter((c) => !c.parentId).sort(byOrder)) {
    orderedRows.push({ cat: parent, isChild: false });
    for (const child of items
      .filter((c) => c.parentId && c.parentId === parent.id)
      .sort(byOrder)) {
      orderedRows.push({ cat: child, isChild: true });
    }
  }
  // Any subcategory whose parent is missing from this list still shows.
  for (const orphan of items.filter(
    (c) => c.parentId && !items.some((p) => p.id === c.parentId),
  )) {
    orderedRows.push({ cat: orphan, isChild: true });
  }

  async function persist(orderedIds: string[]) {
    setSavingOrder(true);
    setOrderSaved(false);
    setError(null);
    try {
      const res = await reorderCategoriesAction(orderedIds);
      if (res.success) {
        setOrderSaved(true);
        setTimeout(() => setOrderSaved(false), 2500);
        router.refresh();
      } else {
        setError(res.error || "Couldn't save the new order.");
        setItems(categories); // put the list back the way the server has it
      }
    } catch {
      setError("Couldn't save the new order.");
      setItems(categories);
    } finally {
      setSavingOrder(false);
    }
  }

  /** Moves one category within its own level and saves that level's order. */
  function move(cat: CategoryRow, toIndex: number) {
    const key = groupOf(cat);
    const ids = groupIds(key);
    const from = ids.indexOf(cat.id);
    if (from === -1 || toIndex < 0 || toIndex >= ids.length || toIndex === from) {
      return;
    }
    const next = reorder(ids, from, toIndex);
    setItems((prev) =>
      prev.map((c) => {
        const i = next.indexOf(c.id);
        return i === -1 ? c : { ...c, sortOrder: i };
      }),
    );
    persist(next);
  }

  function moveBy(cat: CategoryRow, delta: number) {
    const ids = groupIds(groupOf(cat));
    move(cat, ids.indexOf(cat.id) + delta);
  }

  function onDrop(target: CategoryRow) {
    const source = items.find((c) => c.id === dragId);
    setDragId(null);
    setOverId(null);
    // Different levels: a drag must never re-parent something. That is what
    // the Parent Category field in the edit form is for.
    if (!source || !target || source.id === target.id) return;
    if (groupOf(source) !== groupOf(target)) {
      setError("Drag only reorders within one level. Use Edit to change a parent.");
      return;
    }
    move(source, groupIds(groupOf(target)).indexOf(target.id));
  }

  const startCreate = (presetParentId = "") => {
    setEditingId("new");
    setName("");
    setSlug("");
    // Lands at the bottom of the level it is being added to, rather than
    // colliding with whatever is already at that number.
    setSortOrder(groupIds(presetParentId).length);
    setParentId(presetParentId);
    setImageUrl("");
    setError(null);
  };

  // Flips locally first so the row responds to the click, then reverts if
  // the server refuses — the same pattern the drag reorder above uses.
  const [homepageBusy, setHomepageBusy] = useState<string | null>(null);

  const toggleHomepage = async (cat: CategoryRow) => {
    if (!cat.id) return;
    const next = cat.showOnHomepage === false;
    setHomepageBusy(cat.id);
    setItems((prev) =>
      prev.map((c) => (c.id === cat.id ? { ...c, showOnHomepage: next } : c)),
    );
    const res = await setCategoryHomepageAction(cat.id, next);
    setHomepageBusy(null);
    if (res.success) {
      router.refresh();
    } else {
      setItems((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, showOnHomepage: !next } : c)),
      );
      setError(res.error || "Couldn't change that.");
    }
  };

  const startEdit = (cat: CategoryRow) => {
    setEditingId(cat.id || cat.slug);
    setName(cat.name);
    setSlug(cat.slug);
    setSortOrder(cat.sortOrder || 0);
    setParentId(cat.parentId || "");
    setImageUrl(cat.imageUrl || "");
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setParentId("");
    setImageUrl("");
    setError(null);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (editingId === "new") {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingId === "new") {
        const res = await createCategoryAction(
          name,
          slug,
          sortOrder,
          parentId || null,
          imageUrl || null,
        );
        if (res.success) {
          cancelEdit();
          router.refresh();
        } else {
          setError(res.error || "Failed to create category");
        }
      } else if (editingId) {
        const res = await updateCategoryAction(
          editingId,
          name,
          slug,
          sortOrder,
          parentId || null,
          imageUrl || null,
        );
        if (res.success) {
          cancelEdit();
          router.refresh();
        } else {
          setError(res.error || "Failed to update category");
        }
      }
    } catch {
      setError("Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setLoading(true);
    try {
      const res = await deleteCategoryAction(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Failed to delete category");
      }
    } catch {
      alert("Error deleting category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categories Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Drag a row by its handle to set the order shoppers see. Parents
            reorder among parents, subcategories within their parent. The eye
            decides which categories the homepage features — a hidden one
            keeps its page, its nav link and its place in the shop filter.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {savingOrder && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving order…
            </span>
          )}
          {orderSaved && !savingOrder && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <Check className="w-3.5 h-3.5" />
              Order saved
            </span>
          )}
        {editingId !== "new" && (
          <button
            type="button"
            onClick={() => startCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Inline Form if adding or editing */}
      {editingId && (
        <form
          onSubmit={handleSave}
          className="bg-white p-4 sm:p-6 rounded-xl border border-accent shadow-sm space-y-4"
        >
          <h3 className="text-sm font-bold text-gray-900 uppercase">
            {editingId === "new" ? "New Category" : "Edit Category"}
          </h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full sm:w-1/2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#c0282b]"
            >
              <option value="">None — top-level category</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Pick a parent to make this a subcategory. Products are assigned to
              subcategories; a parent shows everything filed beneath it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Excavators"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="excavators"
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono text-gray-800 focus:outline-none focus:border-[#c0282b]"
              />
            </div>

          </div>

          <ImageField
            label="Category Cover"
            value={imageUrl}
            onChange={setImageUrl}
            hint="Shown on the homepage's Shop by Machine tile. Leave empty and the tile falls back to the first product's photo."
            previewClassName="h-40"
            previewFit="cover"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#c0282b] hover:bg-[#8f1e20] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Category</span>
            </button>
          </div>
        </form>
      )}

      {/* Category List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
            <tr>
              <th className="w-8 sm:w-10 pl-3 sm:pl-4 py-3 sm:py-3.5" aria-label="Reorder" />
              <th className="px-3 sm:px-6 py-3 sm:py-3.5">Category Name</th>
              <th className="hidden sm:table-cell px-6 py-3.5">URL Slug</th>
              <th className="px-3 sm:px-6 py-3 sm:py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orderedRows.map(({ cat, isChild }) => {
              const siblings = groupIds(groupOf(cat));
              const pos = siblings.indexOf(cat.id);
              const isDragging = dragId === cat.id;
              const isOver = overId === cat.id && dragId !== cat.id;
              const sameLevel =
                !!dragId &&
                groupOf(items.find((c) => c.id === dragId) ?? {}) === groupOf(cat);

              return (
              <tr
                key={cat.id || cat.slug}
                draggable={!!cat.id && !savingOrder}
                onDragStart={() => setDragId(cat.id)}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDragOver={(e) => {
                  if (!dragId || !sameLevel) return;
                  e.preventDefault(); // without this the drop never fires
                  setOverId(cat.id);
                }}
                onDragLeave={() => setOverId((id) => (id === cat.id ? null : id))}
                onDrop={(e) => { e.preventDefault(); onDrop(cat); }}
                className={`hover:bg-gray-50/70 transition-colors ${
                  isDragging ? "opacity-40" : ""
                } ${isOver ? "bg-accent/5 outline outline-2 -outline-offset-2 outline-accent" : ""}`}
              >
                <td className="w-8 sm:w-10 pl-3 sm:pl-4 py-3 sm:py-4">
                  <div className="flex items-center gap-1 text-gray-300">
                    <GripVertical
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                        cat.id ? "cursor-grab active:cursor-grabbing text-gray-400" : ""
                      }`}
                    />
                    <span className="text-[10px] sm:text-[11px] font-mono text-gray-400 tabular-nums">
                      {pos >= 0 ? pos + 1 : "—"}
                    </span>
                  </div>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-gray-900">
                  <div
                    className={`flex items-center gap-2 sm:gap-2.5 ${isChild ? "pl-3 sm:pl-6" : ""}`}
                  >
                    {isChild ? (
                      <CornerDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 shrink-0" />
                    ) : (
                      <FolderTree className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
                    )}
                    {/* Whether a cover is set is the thing you want to see at
                        a glance; an empty frame says "still borrowing a
                        product photo". */}
                    <span className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                      {cat.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs sm:text-sm ${isChild ? "font-semibold" : ""}`}>{cat.name}</span>
                        {!isChild && (
                          <span className="text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                            {categories.filter((c) => c.parentId === cat.id).length ||
                              ""}
                            {categories.filter((c) => c.parentId === cat.id).length
                              ? " sub"
                              : ""}
                          </span>
                        )}
                      </div>
                      <span className="block sm:hidden text-[10px] font-mono text-gray-400 font-normal truncate max-w-[140px]">
                        {cat.slug}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="hidden sm:table-cell px-6 py-4 font-mono text-xs text-gray-600">
                  {cat.slug}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* HTML5 drag does nothing on touch, so the same move is
                        always available as a button. */}
                    {cat.id && siblings.length > 1 && (
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => moveBy(cat, -1)}
                          disabled={pos <= 0 || savingOrder}
                          title="Move up"
                          aria-label={`Move ${cat.name} up`}
                          className="p-1 text-gray-400 hover:text-accent hover:bg-gray-100 rounded transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBy(cat, 1)}
                          disabled={pos < 0 || pos >= siblings.length - 1 || savingOrder}
                          title="Move down"
                          aria-label={`Move ${cat.name} down`}
                          className="p-1 text-gray-400 hover:text-accent hover:bg-gray-100 rounded transition-colors disabled:opacity-25 disabled:hover:bg-transparent"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {!isChild && cat.id && (
                      <button
                        type="button"
                        onClick={() => startCreate(cat.id)}
                        title="Add subcategory"
                        aria-label={`Add a subcategory under ${cat.name}`}
                        className="p-1.5 text-gray-400 hover:text-accent hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    {cat.id && (
                      <button
                        type="button"
                        onClick={() => toggleHomepage(cat)}
                        disabled={homepageBusy === cat.id}
                        title={
                          cat.showOnHomepage === false
                            ? "Hidden from the homepage — click to show"
                            : "Showing on the homepage — click to hide"
                        }
                        aria-label={`${cat.showOnHomepage === false ? "Show" : "Hide"} ${cat.name} on the homepage`}
                        aria-pressed={cat.showOnHomepage !== false}
                        className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${
                          cat.showOnHomepage === false
                            ? "text-gray-300 hover:text-gray-600 hover:bg-gray-100"
                            : "text-accent hover:bg-red-50"
                        }`}
                      >
                        {cat.showOnHomepage === false ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      title="Edit"
                      aria-label={`Edit ${cat.name}`}
                      className="p-1.5 text-gray-600 hover:text-accent hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {cat.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        title="Delete"
                        aria-label={`Delete ${cat.name}`}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
