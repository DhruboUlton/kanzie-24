"use client";

import { useState, useEffect } from "react";
import { X, UploadCloud, Images, Check } from "lucide-react";
import { MediaItem, MediaPickerProps } from "./types";
import MediaUploadZone from "./MediaUploadZone";
import MediaLibraryGrid from "./MediaLibraryGrid";

export default function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  allowedTypes = ["IMAGE", "VIDEO"],
  multiple = false,
  title,
  confirmText = "Insert Media",
  initialSelectedUrls = [],
}: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "library">("library");
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Default title based on media types
  const computedTitle =
    title ||
    (allowedTypes.length === 1 && allowedTypes[0] === "IMAGE"
      ? "Select or Upload Images"
      : allowedTypes.length === 1 && allowedTypes[0] === "VIDEO"
      ? "Select or Upload Video"
      : "Media Library & Uploader");

  // Reset or initialize state when opened
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // If no initial items, we start on library or upload tab
      setActiveTab("library");
    } else {
      document.body.style.overflow = "";
      setSelectedItems([]);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleToggleSelect(item: MediaItem) {
    if (!multiple) {
      // Single selection: clicking selects or deselects
      if (selectedItems.some((s) => s.id === item.id || s.url === item.url)) {
        setSelectedItems([]);
      } else {
        setSelectedItems([item]);
      }
    } else {
      // Multi selection: toggle item in list
      if (selectedItems.some((s) => s.id === item.id || s.url === item.url)) {
        setSelectedItems((prev) => prev.filter((s) => s.id !== item.id && s.url !== item.url));
      } else {
        setSelectedItems((prev) => [...prev, item]);
      }
    }
  }

  function handleUploadSuccess(newlyUploaded: MediaItem[]) {
    // Automatically switch to library tab and select the uploaded items!
    if (!multiple) {
      setSelectedItems([newlyUploaded[0]]);
    } else {
      setSelectedItems((prev) => [...prev, ...newlyUploaded]);
    }
    setActiveTab("library");
    setRefreshKey((k) => k + 1);
  }

  function handleConfirmSelection() {
    if (selectedItems.length === 0) return;
    onSelect(selectedItems);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Modal Dialog Window */}
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] max-h-[850px] shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-6">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              {computedTitle}
            </h2>

            {/* WordPress Tabs: Upload Files | Media Library */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "upload"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Files</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "library"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Images className="w-3.5 h-3.5" />
                <span>Media Library</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close modal"
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === "upload" ? (
            <div className="p-6 sm:p-10 h-full overflow-y-auto max-w-3xl mx-auto flex flex-col justify-center">
              <MediaUploadZone
                allowedTypes={allowedTypes}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          ) : (
            <MediaLibraryGrid
              key={refreshKey}
              allowedTypes={allowedTypes}
              multiple={multiple}
              selectedItems={selectedItems}
              onToggleSelect={handleToggleSelect}
              isPickerMode={true}
              onRefreshNeeded={() => setRefreshKey((k) => k + 1)}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            {selectedItems.length > 0 ? (
              <>
                <span className="font-semibold text-gray-900">
                  {selectedItems.length} {selectedItems.length === 1 ? "item" : "items"} selected
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="text-gray-500 hover:text-red-600 underline cursor-pointer"
                >
                  Clear selection
                </button>
              </>
            ) : (
              <span className="text-gray-400">
                {multiple ? "Select one or more items to insert" : "Select an item to insert"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={handleConfirmSelection}
              className="px-5 py-2 bg-[#c0282b] hover:bg-[#a51f22] disabled:opacity-40 disabled:hover:bg-[#c0282b] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
