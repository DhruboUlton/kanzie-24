"use client";

import { useState } from "react";
import Image from "next/image";

// Runtime-uploaded media is streamed from outside the app root, so the
// image optimizer can't resolve it — those load directly instead.
function isUpload(src: string) {
  return src.startsWith("/api/uploads/");
}

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) return null;

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square bg-paper rounded-lg overflow-hidden">
        <Image
          src={current}
          alt={name}
          fill
          priority
          unoptimized={isUpload(current)}
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={i === active}
              className={`relative aspect-square bg-paper rounded-md overflow-hidden border-2 transition-colors cursor-pointer ${
                i === active
                  ? "border-accent"
                  : "border-transparent hover:border-black/20"
              }`}
            >
              <Image
                src={img}
                alt={`${name} — view ${i + 1}`}
                fill
                sizes="120px"
                unoptimized={isUpload(img)}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
