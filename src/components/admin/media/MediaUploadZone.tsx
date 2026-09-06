"use client";

import { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, X, FileIcon } from "lucide-react";
import { MediaItem } from "./types";

interface UploadFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  result?: MediaItem;
}

interface MediaUploadZoneProps {
  allowedTypes?: ("IMAGE" | "VIDEO")[];
  onUploadSuccess: (newItems: MediaItem[]) => void;
  className?: string;
}

export default function MediaUploadZone({
  allowedTypes = ["IMAGE", "VIDEO"],
  onUploadSuccess,
  className = "",
}: MediaUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptsImages = allowedTypes.includes("IMAGE");
  const acceptsVideos = allowedTypes.includes("VIDEO");

  let acceptMimes: string[] = [];
  if (acceptsImages) {
    acceptMimes.push("image/jpeg", "image/png", "image/webp", "image/gif", "image/avif");
  }
  if (acceptsVideos) {
    acceptMimes.push("video/mp4", "video/webm", "video/quicktime", "video/ogg");
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function validateFile(file: File): string | null {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (isImage && !acceptsImages) {
      return "Images not allowed in this field.";
    }
    if (isVideo && !acceptsVideos) {
      return "Videos not allowed in this field.";
    }
    if (!isImage && !isVideo) {
      return "Unsupported file type.";
    }

    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    const limitLabel = isVideo ? "100MB" : "10MB";
    if (file.size > maxSize) {
      return `File size exceeds ${limitLabel} limit.`;
    }

    return null;
  }

  async function processFiles(files: FileList | File[]) {
    const newItems: UploadFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      newItems.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: error ? "error" : "pending",
        progress: error ? 0 : 10,
        error: error || undefined,
      });
    }

    setQueue((prev) => [...newItems, ...prev]);

    // Start uploading valid pending items
    const validItems = newItems.filter((item) => item.status === "pending");
    if (validItems.length === 0) return;

    setIsUploading(true);
    const successfullyUploaded: MediaItem[] = [];

    for (const item of validItems) {
      // Mark as uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 40 } : q))
      );

      try {
        const formData = new FormData();
        formData.append("files", item.file);

        const res = await fetch("/api/admin/media", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        const uploadedItem: MediaItem = Array.isArray(data.items) ? data.items[0] : data.media;

        if (!uploadedItem) {
          throw new Error("Missing media response from server");
        }

        successfullyUploaded.push(uploadedItem);

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "success", progress: 100, result: uploadedItem }
              : q
          )
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "error", progress: 0, error: err.message || "Upload failed" }
              : q
          )
        );
      }
    }

    setIsUploading(false);

    if (successfullyUploaded.length > 0) {
      onUploadSuccess(successfullyUploaded);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  }

  function clearQueueItem(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-8 sm:p-12 border-2 border-dashed rounded-2xl transition-all duration-200 text-center ${
          isDragging
            ? "border-[#c0282b] bg-red-50/50 ring-4 ring-[#c0282b]/10 scale-[1.005]"
            : "border-gray-300 hover:border-gray-400 bg-gray-50/60"
        }`}
      >
        <div className="w-16 h-16 mb-4 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 group-hover:scale-110 transition-transform">
          <UploadCloud className={`w-8 h-8 ${isDragging ? "text-[#c0282b]" : "text-gray-400"}`} />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
          Drop files anywhere to upload
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm">
          Drag and drop multiple files here, or browse from your computer.
        </p>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-5 py-2.5 bg-gray-900 hover:bg-black active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Select Files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptMimes.join(",")}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
          {acceptsImages && <span>Images (Max 10MB): JPG, PNG, WebP, GIF, AVIF</span>}
          {acceptsImages && acceptsVideos && <span>•</span>}
          {acceptsVideos && <span>Videos (Max 100MB): MP4, WebM, MOV</span>}
        </div>
      </div>

      {/* Upload Queue Progress */}
      {queue.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Uploads ({queue.length})
            </h4>
            {queue.every((q) => q.status !== "uploading") && (
              <button
                type="button"
                onClick={() => setQueue([])}
                className="text-[11px] text-gray-500 hover:text-gray-900 font-medium cursor-pointer"
              >
                Clear list
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-xs text-xs"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                  <FileIcon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-800 truncate" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatBytes(item.size)}
                    </span>
                  </div>

                  {/* Status Bar */}
                  {item.status === "uploading" && (
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#c0282b] h-full transition-all duration-300 rounded-full"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.status === "success" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded & added to library
                    </span>
                  )}

                  {item.status === "error" && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium truncate">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {item.error || "Failed"}
                    </span>
                  )}
                </div>

                {item.status !== "uploading" && (
                  <button
                    type="button"
                    onClick={() => clearQueueItem(item.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
