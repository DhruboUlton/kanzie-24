"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import SkeletonImage from "@/components/SkeletonImage";
import SkeletonVideo from "@/components/SkeletonVideo";
import {
  Search,
  Filter,
  ArrowUpDown,
  Check,
  Video as VideoIcon,
  Trash2,
  Copy,
  CheckCheck,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Play,
  FileQuestion,
  RefreshCw,
  X,
  PanelRight,
} from "lucide-react";
import { MediaItem } from "./types";
import { updateMediaMetadataAction, deleteMediaPermanentlyAction, getMediaUsageAction } from "@/lib/actions/media";

interface MediaLibraryGridProps {
  allowedTypes?: ("IMAGE" | "VIDEO")[];
  multiple?: boolean;
  selectedItems: MediaItem[];
  onToggleSelect: (item: MediaItem) => void;
  // When in standalone page mode, selection might not be the primary action
  isPickerMode?: boolean;
  onRefreshNeeded?: () => void;
}

export default function MediaLibraryGrid({
  allowedTypes = ["IMAGE", "VIDEO"],
  multiple = false,
  selectedItems,
  onToggleSelect,
  isPickerMode = true,
  onRefreshNeeded,
}: MediaLibraryGridProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IMAGE" | "VIDEO">(
    allowedTypes.length === 1 ? allowedTypes[0] : "ALL"
  );
  const [sort, setSort] = useState<"newest" | "oldest" | "name_asc" | "size_desc">("newest");

  // Active / Inspected item for WordPress-style Attachment Details sidebar
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setShowDetails(true);
    }
  }, []);

  // The mobile details drawer is a fixed overlay, not a modal component with
  // its own scroll lock (MediaPickerModal locks the body itself when this
  // grid renders inside it) — on the standalone /adpnl/media page nothing
  // else stops the page behind it from rubber-band scrolling on iOS.
  const isMobileDrawerOpen = showDetails && !!activeItem;
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    if (!isMobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileDrawerOpen]);

  // Metadata edit state
  const [editTitle, setEditTitle] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Delete modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Every place the file is referenced. Non-empty means deletion is refused
  // — by this dialog and, independently, by the server action.
  const [deleteUsage, setDeleteUsage] = useState<
    { area: string; label: string; href?: string }[]
  >([]);
  const [deleteUsageChecked, setDeleteUsageChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch media from API
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("limit", "48");

      const res = await fetch(`/api/admin/media?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);

        // Update activeItem if it's currently selected or set to first
        if (data.items.length > 0) {
          setActiveItem((prev) => {
            if (!prev) return data.items[0];
            const found = data.items.find((i: MediaItem) => i.id === prev.id);
            return found || data.items[0];
          });
        } else {
          setActiveItem(null);
        }
      }
    } catch (err) {
      console.error("Failed to load media items:", err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, sort, page]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Sync edit state when activeItem changes
  useEffect(() => {
    if (activeItem) {
      setEditTitle(activeItem.title || "");
      setEditAltText(activeItem.altText || "");
      setSaveSuccess(false);
    }
  }, [activeItem]);

  function formatBytes(bytes: number) {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(d: string | Date) {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }

  function isSelected(item: MediaItem) {
    return selectedItems.some((s) => s.id === item.id || s.url === item.url);
  }

  function getSelectionIndex(item: MediaItem) {
    return selectedItems.findIndex((s) => s.id === item.id || s.url === item.url) + 1;
  }

  function handleCardClick(item: MediaItem) {
    setActiveItem(item);
    if (!isPickerMode) {
      setShowDetails(true);
    }
    onToggleSelect(item);
  }

  function handleCopyUrl(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  function handleSaveMetadata() {
    if (!activeItem) return;
    startTransition(async () => {
      const res = await updateMediaMetadataAction(activeItem.id, {
        title: editTitle,
        altText: editAltText,
      });
      if (res.success && res.media) {
        setSaveSuccess(true);
        setActiveItem(res.media);
        setItems((prev) =>
          prev.map((it) => (it.id === activeItem.id ? { ...it, ...res.media } : it))
        );
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    });
  }

  async function openDeleteConfirm(item: MediaItem) {
    setConfirmDeleteId(item.id);
    setDeleteError(null);
    setDeleteUsage([]);
    setDeleteUsageChecked(false);
    try {
      const res = await getMediaUsageAction(item.id);
      if (res.success && res.usage) {
        setDeleteUsage(res.usage);
      } else if (!res.success) {
        // Never fall through to an enabled Delete button on a failed check —
        // "we don't know" must not read as "not in use".
        setDeleteError(res.error || "Couldn't check where this file is used.");
        setDeleteUsage([{ area: "Unknown", label: "usage check failed" }]);
      }
    } catch (err) {
      console.warn("Could not check media usage:", err);
      setDeleteError("Couldn't check where this file is used.");
      setDeleteUsage([{ area: "Unknown", label: "usage check failed" }]);
    } finally {
      setDeleteUsageChecked(true);
    }
  }

  async function executeDelete(id: string) {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteMediaPermanentlyAction(id);
      if (!res.success) {
        if ((res as any).inUse && (res as any).usage) {
          setDeleteUsage((res as any).usage);
        }
        setDeleteError(res.error || "Failed to delete media item");
        setIsDeleting(false);
        return;
      }

      // Remove from state
      setItems((prev) => prev.filter((it) => it.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      if (activeItem?.id === id) {
        setActiveItem(null);
        setShowDetails(false);
      }
      setConfirmDeleteId(null);
      onRefreshNeeded?.();
    } catch (err: any) {
      setDeleteError(err.message || "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  function renderDetailsContent(item: MediaItem) {
    return (
      <div className="p-4 space-y-5 text-xs">
        <div>
          {/* Preview Box */}
          <div className="relative w-full aspect-video rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
            {item.type === "VIDEO" ? (
              <SkeletonVideo
                src={item.url}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain bg-black"
                containerClassName="w-full h-full flex items-center justify-center"
              />
            ) : (
              <SkeletonImage
                src={item.url}
                alt={item.altText || ""}
                fill
                unoptimized={!item.url.startsWith("/")}
                sizes="(max-width: 1024px) 100vw, 420px"
                className="object-contain p-1"
              />
            )}
          </div>

          {/* File Metadata List */}
          <div className="mt-3 space-y-1 text-gray-600">
            <div className="font-semibold text-gray-900 truncate" title={item.filename}>
              {item.filename}
            </div>
            <div className="text-[11px] text-gray-400">
              {formatDate(item.createdAt)} • {formatBytes(item.size)}
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              {item.mimeType}
            </div>
            {item.usageCount !== undefined && (
              <div className="text-[11px] text-gray-500 pt-1 font-medium">
                Used in {item.usageCount} {item.usageCount === 1 ? "product" : "products"}
              </div>
            )}
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Media Title"
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              Alternative Text (Alt text)
            </label>
            <input
              type="text"
              value={editAltText}
              onChange={(e) => setEditAltText(e.target.value)}
              placeholder="Describe the purpose of this media"
              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b]"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">
              Leave blank if decorative. Helps SEO and screen readers.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleSaveMetadata}
              disabled={isPending}
              className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Save Details</span>
            </button>

            {saveSuccess && (
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>
        </div>

        {/* URL & Quick Actions */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">
              File URL
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                readOnly
                value={item.url}
                className="flex-1 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-[11px] font-mono text-gray-600 select-all"
              />
              <button
                type="button"
                onClick={() => handleCopyUrl(item.url)}
                title="Copy URL"
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-gray-700 transition-colors flex items-center cursor-pointer"
              >
                {copiedUrl ? (
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              <span>View original</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Permanent Delete Action */}
            <button
              type="button"
              onClick={() => openDeleteConfirm(item)}
              className="text-[11px] text-red-600 hover:text-red-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete permanently</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter */}
          {allowedTypes.length > 1 && (
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as any);
                  setPage(1);
                }}
                className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#c0282b]"
              >
                <option value="ALL">All Media Items</option>
                <option value="IMAGE">Images only</option>
                <option value="VIDEO">Videos only</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Sort Filter */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as any);
                setPage(1);
              }}
              className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-[#c0282b]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name_asc">Name (A–Z)</option>
              <option value="size_desc">File size (largest)</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={fetchMedia}
            title="Refresh list"
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#c0282b]" : ""}`} />
          </button>

          {/* Details Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (!showDetails && !activeItem && items.length > 0) {
                setActiveItem(items[0]);
              }
              setShowDetails((prev) => !prev);
            }}
            title={showDetails ? "Hide details panel" : "Show details panel"}
            className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              showDetails && activeItem
                ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Details</span>
          </button>
        </div>

        {/* Search & Count */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media items..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-[#c0282b] focus:bg-white transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <span className="text-xs text-gray-500 shrink-0 font-medium">
            {total} {total === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Main Area: Split Grid and Details Sidebar */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
        {/* Left Side: Media Grid */}
        <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 bg-gray-50/50">
          {loading && items.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#c0282b]" />
              <span className="text-xs">Loading media library...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
              <FileQuestion className="w-10 h-10 stroke-[1.5] mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">No media found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                {search
                  ? `No items match "${search}". Try clearing your search or filters.`
                  : "Upload files from the Upload Files tab to add them to your library."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {items.map((item) => {
                const selected = isSelected(item);
                const isActive = activeItem?.id === item.id;
                const isVideo = item.type === "VIDEO";
                const index = getSelectionIndex(item);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCardClick(item)}
                    className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-150 select-none bg-white shadow-xs ${
                      selected
                        ? "border-[#c0282b] ring-3 ring-[#c0282b]/20 shadow-md"
                        : isActive
                        ? "border-gray-800"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {/* Media Thumbnail */}
                    {isVideo ? (
                      <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center p-2 text-white relative">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                        </div>
                        <span className="absolute bottom-2 left-2 right-2 text-[10px] truncate text-center text-white/80 font-medium">
                          {item.filename}
                        </span>
                        <div className="absolute top-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase text-white flex items-center gap-1">
                          <VideoIcon className="w-2.5 h-2.5" /> VIDEO
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full relative bg-[repeating-conic-gradient(#f8f9fa_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]">
                        <SkeletonImage
                          src={item.url}
                          alt={item.altText || item.filename}
                          fill
                          unoptimized={!item.url.startsWith("/")}
                          className="object-contain p-1 group-hover:scale-[1.03] transition-all duration-200"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </div>
                    )}

                    {/* Selection Checkbox Badge */}
                    <div
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        selected
                          ? "bg-[#c0282b] text-white shadow-sm scale-100"
                          : "bg-black/40 text-white/80 opacity-0 group-hover:opacity-100 scale-90"
                      }`}
                    >
                      {selected ? (
                        multiple ? (
                          <span className="text-[11px] font-bold">{index}</span>
                        ) : (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Usage Tag */}
                    {item.usageCount && item.usageCount > 0 ? (
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                        Used in {item.usageCount}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pb-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Side: WordPress Attachment Details Sidebar (Desktop / Tablet md+) */}
        {showDetails && (
          <div className="hidden md:flex w-72 lg:w-80 border-l border-gray-200 bg-white flex-col shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/75 shrink-0">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Attachment Details
              </h4>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/70 rounded-lg transition-colors cursor-pointer"
                title="Close details sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeItem ? (
                renderDetailsContent(activeItem)
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
                  <FileQuestion className="w-8 h-8 text-gray-300 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-semibold text-gray-600">No media selected</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Click any file on the left to view and edit its attachment details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Drawer Attachment Details Overlay (< md) */}
      {showDetails && activeItem && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div
            className="absolute inset-0"
            onClick={() => setShowDetails(false)}
          />
          <div className="relative bg-white rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="sticky top-0 z-10 bg-white px-4 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Attachment Details
              </h4>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderDetailsContent(activeItem)}
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete media permanently?</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            {!deleteUsageChecked && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking where this file is used…</span>
              </div>
            )}

            {deleteUsageChecked && deleteUsage.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <div className="font-semibold">
                  Can&apos;t delete — still used in {deleteUsage.length}{" "}
                  place{deleteUsage.length === 1 ? "" : "s"}:
                </div>
                <ul className="space-y-1 text-[11px] max-h-40 overflow-y-auto">
                  {deleteUsage.map((u, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="font-semibold shrink-0">{u.area}:</span>
                      <span className="text-amber-800">{u.label}</span>
                      {u.href && (
                        <a
                          href={u.href}
                          className="ml-auto shrink-0 underline hover:no-underline font-medium"
                        >
                          open
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-amber-700 pt-0.5">
                  Remove it from those first. Deleting it here would leave a broken
                  image on the storefront.
                </p>
              </div>
            )}

            {deleteUsageChecked && deleteUsage.length === 0 && (
              <p className="text-xs text-gray-600 leading-relaxed">
                Not used anywhere. Deleting permanently removes it from the Media
                Library and disk storage.
              </p>
            )}

            {deleteError && (
              <div className="text-xs text-red-600 font-medium">{deleteError}</div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || !deleteUsageChecked || deleteUsage.length > 0}
                title={
                  deleteUsage.length > 0
                    ? "This file is in use on the storefront. Remove it there first."
                    : undefined
                }
                onClick={() => executeDelete(confirmDeleteId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-red-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
