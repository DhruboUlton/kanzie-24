"use client";

import { RotateCcw } from "lucide-react";

export default function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  const valid = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : fallback}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="w-10 h-9 rounded-lg border border-gray-300 bg-white p-1 cursor-pointer shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fallback}
          spellCheck={false}
          className={`flex-1 min-w-0 px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none ${
            valid
              ? "border-gray-300 focus:border-[#c0282b]"
              : "border-red-300 focus:border-red-500"
          }`}
        />
        {value.toLowerCase() !== fallback.toLowerCase() && (
          <button
            type="button"
            onClick={() => onChange(fallback)}
            title="Reset to default colour"
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
      {!valid && (
        <p className="text-[11px] text-red-600 mt-1">
          Use a hex colour like {fallback} — saving keeps the previous value
          until this is valid.
        </p>
      )}
    </div>
  );
}
