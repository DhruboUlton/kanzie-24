"use client";

import { useState } from "react";
import { UploadCloud, X, FolderKanban } from "lucide-react";
import MediaLibraryGrid from "@/components/admin/media/MediaLibraryGrid";
import MediaUploadZone from "@/components/admin/media/MediaUploadZone";
import { MediaItem } from "@/components/admin/media/types";

export default function MediaPageClient() {
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);

  function handleUploadSuccess(newItems: MediaItem[]) {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Media Library
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Centralized storage for all photos and videos. Uploaded assets are reusable across products, banners, and store content.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadZone((prev) => !prev)}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
            showUploadZone
              ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
              : "bg-[#c0282b] hover:bg-[#a51f22] text-white"
          }`}
        >
          {showUploadZone ? (
            <>
              <X className="w-4 h-4" />
              <span>Close Uploader</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>Add New Media</span>
            </>
          )}
        </button>
      </div>

      {/* Collapsible Upload Zone */}
      {showUploadZone && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in duration-200">
          <MediaUploadZone
            allowedTypes={["IMAGE", "VIDEO"]}
            onUploadSuccess={handleUploadSuccess}
          />
        </div>
      )}

      {/* Media Grid & Sidebar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden h-[750px] flex flex-col">
        <MediaLibraryGrid
          key={refreshKey}
          allowedTypes={["IMAGE", "VIDEO"]}
          multiple={true}
          selectedItems={selectedItems}
          onToggleSelect={(item) => {
            setSelectedItems((prev) =>
              prev.some((i) => i.id === item.id)
                ? prev.filter((i) => i.id !== item.id)
                : [...prev, item]
            );
          }}
          isPickerMode={false}
          onRefreshNeeded={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </div>
  );
}
