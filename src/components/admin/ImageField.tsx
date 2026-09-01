"use client";

import { useState } from "react";
import { Upload, Trash2, Loader2, ImageIcon } from "lucide-react";

// Upload-or-paste image input. Uploads go through the same persistent
// route as product photos; a pasted URL is stored as-is.
export default function ImageField({
  label,
  value,
  onChange,
  hint,
  previewClassName = "h-32",
  previewFit = "contain",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  previewClassName?: string;
  previewFit?: "contain" | "cover";
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-700">{label}</label>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload a file"
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#c0282b]"
        />
        <div className="flex items-center gap-2 shrink-0">
          <label className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{uploading ? "Uploading…" : "Upload"}</span>
            <input
              type="file"
              accept="image/png,image/webp,image/jpeg,image/avif"
              onChange={handleUpload}
              className="hidden"
            />
          </label>
          {value.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onChange("")}
              title="Remove image"
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-600">{error}</p>}

      <div
        className={`relative w-full ${previewClassName} rounded-lg border border-gray-200 bg-[repeating-conic-gradient(#f3f4f6_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] overflow-hidden`}
      >
        {value.trim().length > 0 ? (
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
            <span>No image — this part is hidden on the storefront</span>
          </div>
        )}
      </div>
    </div>
  );
}
