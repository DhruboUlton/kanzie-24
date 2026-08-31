"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit2,
  Trash2,
  FolderTree,
  CornerDownRight,
  Loader2,
} from "lucide-react";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from "@/lib/actions/category";

export default function CategoryManagerClient({
  categories,
}: {
  categories: any[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [parentId, setParentId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nesting is one level deep, so only categories that aren't already a
  // subcategory can be picked as a parent.
  const parentOptions = categories.filter(
    (c) => c.id && !c.parentId && c.id !== editingId,
  );

  // Parents first, each immediately followed by its own subcategories.
  const orderedRows: { cat: any; isChild: boolean }[] = [];
  for (const parent of categories.filter((c) => !c.parentId)) {
    orderedRows.push({ cat: parent, isChild: false });
    for (const child of categories.filter(
      (c) => c.parentId && c.parentId === parent.id,
    )) {
      orderedRows.push({ cat: child, isChild: true });
    }
  }
  // Any subcategory whose parent is missing from this list still shows.
  for (const orphan of categories.filter(
    (c) => c.parentId && !categories.some((p) => p.id === c.parentId),
  )) {
    orderedRows.push({ cat: orphan, isChild: true });
  }

  const startCreate = (presetParentId = "") => {
    setEditingId("new");
    setName("");
    setSlug("");
    setSortOrder((categories.length || 0) + 1);
    setParentId(presetParentId);
    setError(null);
  };

  const startEdit = (cat: any) => {
    setEditingId(cat.id || cat.slug);
    setName(cat.name);
    setSlug(cat.slug);
    setSortOrder(cat.sortOrder || 0);
    setParentId(cat.parentId || "");
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setSlug("");
    setParentId("");
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
        const res = await createCategoryAction(name, slug, sortOrder, parentId || null);
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
        );
        if (res.success) {
          cancelEdit();
          router.refresh();
        } else {
          setError(res.error || "Failed to update category");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save category");
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
    } catch (err: any) {
      alert(err.message || "Error deleting category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categories Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Organize catalog groupings and homepage collection tiles
          </p>
        </div>
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

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Inline Form if adding or editing */}
      {editingId && (
        <form
          onSubmit={handleSave}
          className="bg-white p-6 rounded-xl border border-accent shadow-sm space-y-4"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#c0282b]"
              />
            </div>
          </div>

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
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
            <tr>
              <th className="px-6 py-3.5">Category Name</th>
              <th className="px-6 py-3.5">URL Slug</th>
              <th className="px-6 py-3.5">Sort Order</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orderedRows.map(({ cat, isChild }) => (
              <tr key={cat.id || cat.slug} className="hover:bg-gray-50/70">
                <td className="px-6 py-4 font-bold text-gray-900">
                  <div
                    className={`flex items-center gap-2.5 ${isChild ? "pl-6" : ""}`}
                  >
                    {isChild ? (
                      <CornerDownRight className="w-4 h-4 text-gray-300 shrink-0" />
                    ) : (
                      <FolderTree className="w-4 h-4 text-accent shrink-0" />
                    )}
                    <span className={isChild ? "font-semibold" : ""}>{cat.name}</span>
                    {!isChild && (
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                        {categories.filter((c) => c.parentId === cat.id).length ||
                          ""}
                        {categories.filter((c) => c.parentId === cat.id).length
                          ? " sub"
                          : ""}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-gray-600">
                  {cat.slug}
                </td>
                <td className="px-6 py-4 text-xs font-semibold text-gray-700">
                  {cat.sortOrder ?? 0}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!isChild && cat.id && (
                      <button
                        type="button"
                        onClick={() => startCreate(cat.id)}
                        title="Add subcategory"
                        className="p-1.5 text-gray-400 hover:text-accent hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-gray-600 hover:text-accent hover:bg-gray-100 rounded-md transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {cat.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
