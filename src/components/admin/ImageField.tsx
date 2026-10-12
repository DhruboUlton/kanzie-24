"use client";

import { useState } from "react";
import { Trash2, ImageIcon, Images } from "lucide-react";
import MediaPickerModal from "./media/MediaPickerModal";
import { MediaItem } from "./media/types";

// Upload-or-paste image input powered by centralized Media Library.
export default function ImageField({
  label,
  value,
  onChange,
  hint,
  previewClassName = "h-32",
  previewFit = "contain",
  video = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  previewClassName?: string;
  previewFit?: "contain" | "cover";
  // Picks a video from the library instead of an image.
  video?: boolean;
}) {
  const kind = video ? "video" : "image";
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleSelect(selected: MediaItem[]) {
    if (selected[0]) {
      onChange(selected[0].url);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-gray-700">{label}</label>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="text-xs font-semibold text-[#c0282b] hover:text-[#a51f22] inline-flex items-center gap-1 cursor-pointer"
        >
          <Images className="w-3.5 h-3.5" />
          <span>Choose from Media Library</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or select from Media Library"
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#c0282b]"
        />
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs"
          >
            <Images className="w-3.5 h-3.5" />
            <span>Select Media</span>
          </button>
          {value.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              title={`Remove ${kind}`}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}

      <div
        className={`relative w-full ${previewClassName} rounded-lg border border-gray-200 bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] overflow-hidden`}
      >
        {value.trim().length > 0 && video ? (
          <video
            src={value}
            muted
            playsInline
            preload="metadata"
            className={`absolute inset-0 w-full h-full ${
              previewFit === "cover" ? "object-cover" : "object-contain"
            }`}
          />
        ) : value.trim().length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className={`absolute inset-0 w-full h-full ${
              previewFit === "cover" ? "object-cover" : "object-contain"
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-gray-400 text-xs">
            <ImageIcon className="w-4 h-4" />
            <span>No {kind} selected</span>
          </div>
        )}
      </div>

      {/* Reusable WordPress Media Picker */}
      <MediaPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelect}
        allowedTypes={video ? ["VIDEO"] : ["IMAGE"]}
        multiple={false}
        title={`Select ${label}`}
        confirmText={`Use This ${video ? "Video" : "Image"}`}
      />
    </div>
  );
}
