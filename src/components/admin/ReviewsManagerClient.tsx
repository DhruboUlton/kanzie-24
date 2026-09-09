"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Star,
  Search,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Images,
  MessageSquareQuote,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { Testimonial } from "@/lib/testimonials";
import {
  saveTestimonialAction,
  deleteTestimonialAction,
  toggleTestimonialActiveAction,
  reorderTestimonialsAction,
} from "@/lib/actions/testimonials";
import ReviewerAvatar from "@/components/ReviewerAvatar";
import MediaPickerModal from "@/components/admin/media/MediaPickerModal";
import { MediaItem } from "@/components/admin/media/types";

const AVATAR_PRESETS = [
  { name: "Marcus", role: "Parent", url: "/testimonials/marcus.jpg" },
  { name: "Priya", role: "Dual Set Owner", url: "/testimonials/priya.jpg" },
  { name: "Dan", role: "Sandbox Tester", url: "/testimonials/dan.jpg" },
  { name: "Sarah", role: "Verified Buyer", url: "/testimonials/sarah.jpg" },
  { name: "Liam", role: "RC Collector", url: "/testimonials/liam.jpg" },
  { name: "Elena", role: "Gift Buyer", url: "/testimonials/elena.jpg" },
];

export default function ReviewsManagerClient({
  initialTestimonials,
  canManage = true,
}: {
  initialTestimonials: Testimonial[];
  canManage?: boolean;
}) {
  const [items, setItems] = useState<Testimonial[]>(initialTestimonials);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "hidden">("all");

  // Modal states
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Testimonial | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formQuote, setFormQuote] = useState("");
  // Empty by default: a new review shows the reviewer's initial unless
  // someone deliberately picks a picture.
  const [formAvatar, setFormAvatar] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formIsActive, setFormIsActive] = useState(true);

  // Status feedback
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  function showMessage(type: "success" | "error", text: string) {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  }

  function openCreateModal() {
    setEditingItem(null);
    setFormName("");
    setFormRole("Verified Buyer");
    setFormQuote("");
    setFormAvatar("");
    setFormRating(5);
    setFormIsActive(true);
    setIsModalOpen(true);
  }

  function openEditModal(item: Testimonial) {
    setEditingItem(item);
    setFormName(item.name);
    setFormRole(item.role || "");
    setFormQuote(item.quote);
    setFormAvatar(item.avatar);
    setFormRating(item.rating || 5);
    setFormIsActive(item.isActive);
    setIsModalOpen(true);
  }

  function handleSave() {
    if (!formName.trim()) {
      showMessage("error", "Reviewer name is required.");
      return;
    }
    if (!formQuote.trim()) {
      showMessage("error", "Review quote is required.");
      return;
    }

    startTransition(async () => {
      const payload = {
        id: editingItem?.id,
        name: formName.trim(),
        role: formRole.trim(),
        quote: formQuote.trim(),
        avatar: formAvatar.trim(),
        rating: formRating,
        isActive: formIsActive,
      };

      const res = await saveTestimonialAction(payload);
      if (res.success && res.testimonial) {
        if (editingItem) {
          setItems((prev) =>
            prev.map((t) => (t.id === res.testimonial!.id ? res.testimonial! : t))
          );
          showMessage("success", "Review updated successfully.");
        } else {
          setItems((prev) => [res.testimonial!, ...prev]);
          showMessage("success", "New review added successfully.");
        }
        setIsModalOpen(false);
      } else {
        showMessage("error", res.error || "Failed to save review.");
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deletingItem) return;
    const id = deletingItem.id;

    startTransition(async () => {
      const res = await deleteTestimonialAction(id);
      if (res.success) {
        setItems((prev) => prev.filter((t) => t.id !== id));
        showMessage("success", "Review deleted.");
        setDeletingItem(null);
      } else {
        showMessage("error", res.error || "Failed to delete review.");
      }
    });
  }

  function handleToggleActive(id: string, currentActive: boolean) {
    startTransition(async () => {
      const res = await toggleTestimonialActiveAction(id, !currentActive);
      if (res.success) {
        setItems((prev) =>
          prev.map((t) => (t.id === id ? { ...t, isActive: !currentActive } : t))
        );
        showMessage(
          "success",
          `Review ${!currentActive ? "is now active" : "is now hidden"}.`
        );
      } else {
        showMessage("error", res.error || "Failed to toggle status.");
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const newList = [...items];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIdx, 0, moved);

    setItems(newList);

    startTransition(async () => {
      const ids = newList.map((t) => t.id);
      const res = await reorderTestimonialsAction(ids);
      if (!res.success) {
        showMessage("error", "Failed to save new order.");
      }
    });
  }

  function handleMediaPickerSelect(selected: MediaItem[]) {
    if (selected.length > 0 && selected[0].url) {
      setFormAvatar(selected[0].url);
    }
  }

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterTab === "active" && !item.isActive) return false;
    if (filterTab === "hidden" && item.isActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.quote.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = items.filter((t) => t.isActive).length;
  const averageRating =
    items.length > 0
      ? (items.reduce((sum, t) => sum + (t.rating || 5), 0) / items.length).toFixed(1)
      : "5.0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-50 text-[#c0282b]">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Customer Reviews &amp; Testimonials
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 pl-10">
            Manage customer quotes that continuously slide in the homepage testimonial carousel.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#c0282b] hover:bg-[#a51f22] text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Review</span>
          </button>
        )}
      </div>

      {/* Status Notification Toast */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border animate-in fade-in duration-200 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-red-50 text-red-900 border-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total Reviews
          </span>
          <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Active on Carousel
          </span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Average Rating
          </span>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-gray-900">{averageRating}</p>
            <div className="flex text-amber-500">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === "all"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === "active"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("hidden")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === "hidden"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Hidden ({items.length - activeCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviewer or quote..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c0282b] focus:bg-white"
          />
        </div>
      </div>

      {/* Reviews Cards List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
            <MessageSquareQuote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No reviews found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Try searching for a different keyword or name."
                : "Add your first customer review to show in the storefront carousel."}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 bg-[#c0282b] text-white text-xs font-semibold rounded-xl hover:bg-[#a51f22] transition-colors"
              >
                Add Review
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                item.isActive ? "border-gray-200" : "border-gray-200 bg-gray-50/60 opacity-80"
              }`}
            >
              {/* Left Column: Avatar + Info + Quote */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* 56px Headshot Preview */}
                <div className="shrink-0 relative">
                  <ReviewerAvatar
                    name={item.name}
                    avatar={item.avatar}
                    size={56}
                    className="w-14 h-14 border-2 border-gray-200 shadow-xs"
                  />
                  {!item.isActive && (
                    <span className="absolute -bottom-1 -right-1 bg-gray-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      Off
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-sm text-gray-900">{item.name}</span>
                    {item.role && (
                      <span className="text-xs text-gray-500 font-medium">
                        • {item.role}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {item.isActive ? "Active on carousel" : "Hidden"}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 my-1.5 text-amber-500">
                    {Array.from({ length: item.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-xs sm:text-sm text-gray-700 italic line-clamp-2 leading-relaxed">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
              </div>

              {/* Right Column: Order Controls & Action Buttons */}
              {canManage && (
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto justify-end">
                  {/* Move buttons */}
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    <button
                      type="button"
                      disabled={index === 0 || isPending}
                      onClick={() => handleMove(index, "up")}
                      title="Move review earlier"
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1 || isPending}
                      onClick={() => handleMove(index, "down")}
                      title="Move review later"
                      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent border-l border-gray-200 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toggle Active */}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleActive(item.id, item.isActive)}
                    title={item.isActive ? "Hide from storefront" : "Show on storefront"}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      item.isActive
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        : "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {item.isActive ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => openEditModal(item)}
                    title="Edit review"
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setDeletingItem(item)}
                    title="Delete review"
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-100 text-[#c0282b]">
                  <MessageSquareQuote className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900">
                  {editingItem ? "Edit Review" : "Add Customer Review"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Reviewer Name and Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Reviewer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Marcus T."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c0282b] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Role / Subtitle
                  </label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="e.g. Parent of 7-Year-Old"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c0282b] focus:bg-white"
                  />
                </div>
              </div>

              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Rating
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormRating(star)}
                      className="p-1 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= formRating
                            ? "fill-amber-500 text-amber-500"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-700 ml-2">
                    {formRating} out of 5 stars
                  </span>
                </div>
              </div>

              {/* Testimonial Quote */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Testimonial Quote <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formQuote}
                  onChange={(e) => setFormQuote(e.target.value)}
                  placeholder="Paste what the customer said about their RC machine..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#c0282b] focus:bg-white resize-none"
                />
                <p className="text-[11px] text-gray-400 text-right mt-1">
                  {formQuote.length}/1000 characters
                </p>
              </div>

              {/* Reviewer Headshot Avatar */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">
                  Reviewer Headshot (56px × 56px circular)
                </label>

                <div className="flex items-center gap-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  {/* Live Avatar Circle Preview */}
                  <div className="shrink-0">
                    <ReviewerAvatar
                      name={formName}
                      avatar={formAvatar}
                      size={56}
                      className="w-14 h-14 border-2 border-white shadow-sm ring-1 ring-black/10"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formAvatar}
                        onChange={(e) => setFormAvatar(e.target.value)}
                        placeholder="Leave empty to show the initial"
                        className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#c0282b]"
                      />
                      <button
                        type="button"
                        onClick={() => setIsMediaPickerOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Images className="w-3.5 h-3.5 text-[#c0282b]" />
                        <span>Media Library</span>
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">
                        Presets:
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormAvatar("")}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                          formAvatar === ""
                            ? "bg-[#c0282b] text-white border-[#c0282b]"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        Initial
                      </button>
                      {AVATAR_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setFormAvatar(p.url)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                            formAvatar === p.url
                              ? "bg-[#c0282b] text-white border-[#c0282b]"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#c0282b] focus:ring-[#c0282b] border-gray-300"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">
                    Display on Storefront Carousel
                  </span>
                  <span className="text-[11px] text-gray-500">
                    When checked, this card will automatically slide in the homepage testimonial section.
                  </span>
                </div>
              </label>

              {/* Live Storefront Card Preview Box */}
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Live Storefront Preview
                </span>
                <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200">
                  <div className="w-full max-w-md mx-auto bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                    {/* Stars */}
                    <div className="flex items-center gap-1 mb-3 text-amber-500">
                      {Array.from({ length: formRating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    {/* Quote */}
                    <p className="text-sm italic text-gray-800 leading-relaxed mb-5">
                      &ldquo;
                      {formQuote ||
                        "Great testimonial content goes here. High quality RC toy!"}
                      &rdquo;
                    </p>
                    {/* Bottom: Name on left, 56px Headshot on right */}
                    <div className="pt-4 border-t border-gray-100 flex items-end justify-between gap-3">
                      <div>
                        <div className="font-bold text-xs uppercase tracking-wider text-black">
                          {formName || "Reviewer Name"}
                        </div>
                        <div className="text-[11px] text-black/55 font-medium mt-0.5">
                          {formRole || "Verified Buyer"}
                        </div>
                      </div>
                      <ReviewerAvatar
                        name={formName || "Reviewer Name"}
                        avatar={formAvatar}
                        size={56}
                        className="w-14 h-14 border-2 border-gray-100 shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSave}
                className="px-5 py-2 bg-[#c0282b] hover:bg-[#a51f22] disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isPending ? "Saving..." : editingItem ? "Save Changes" : "Add Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900">Delete Review?</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
              Are you sure you want to remove the testimonial from{" "}
              <strong>{deletingItem.name}</strong>? This action will remove it from the
              homepage carousel.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {isPending ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaPickerSelect}
        allowedTypes={["IMAGE"]}
        multiple={false}
        title="Choose Headshot from Media Library"
        confirmText="Use Headshot"
      />
    </div>
  );
}
