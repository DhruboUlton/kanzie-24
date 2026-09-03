"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function ProductDescription({
  shortDescription,
  descriptionHtml,
}: {
  shortDescription: string;
  descriptionHtml: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = descriptionHtml.trim().length > 0;

  return (
    <div className="mt-5">
      <p className="text-black/70 leading-relaxed">{shortDescription}</p>

      {hasMore && (
        <>
          {/* Full description stays in the DOM even when collapsed so search
              engines index it — only the visual reveal is gated by state. */}
          <div
            hidden={!expanded}
            className="prose prose-sm max-w-none mt-4 text-black/70 prose-headings:font-display prose-headings:text-ink prose-strong:text-ink"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-dark cursor-pointer"
          >
            {expanded ? "Show Less" : "More Details"}
            <ChevronDown
              size={16}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </>
      )}
    </div>
  );
}
