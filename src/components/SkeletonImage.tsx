"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image, { type ImageProps } from "next/image";

export interface SkeletonImageProps extends ImageProps {
  skeletonClassName?: string;
  containerClassName?: string;
  dark?: boolean;
  showSkeleton?: boolean;
}

/**
 * How far the component has got with the file behind `src`.
 *
 * "unknown" is the state the server renders in, and the only one it can
 * render in: whether a file has arrived is a fact about the browser. The
 * image is shown at full opacity until the client says otherwise, so markup
 * that never hydrates still shows its pictures.
 */
type Status = "unknown" | "pending" | "loaded" | "error";

/**
 * SkeletonImage: next/image with a shimmer placeholder until the file loads.
 */
export default function SkeletonImage({
  skeletonClassName = "",
  containerClassName,
  dark = false,
  showSkeleton = true,
  className = "",
  alt,
  onLoad,
  onError,
  fill,
  width,
  height,
  // `priority` is deprecated in Next 16 in favour of `preload`; callers here
  // still use both, and either one marks an image as an LCP candidate.
  priority,
  preload,
  ...props
}: SkeletonImageProps) {
  const isLcpCandidate = Boolean(priority || preload);
  const [status, setStatus] = useState<Status>("unknown");
  const [placeholderMounted, setPlaceholderMounted] = useState(true);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (!node) return;
    // A cached image is already complete before React can attach onLoad, and
    // a broken one is complete with no pixels. Either way the event has been
    // and gone, so the ref is the only place left to read the outcome — and
    // reading it wrong strands the image at opacity 0 for good.
    if (node.complete) {
      setStatus(node.naturalWidth > 0 ? "loaded" : "error");
    } else {
      setStatus("pending");
    }
  }, []);

  const settled = status === "loaded" || status === "error";

  // The LCP candidate is never hidden: an element at opacity 0 is not one as
  // far as the browser is concerned, so skeletoning the hero would push the
  // measurement out to whenever hydration happens to finish.
  const hidden = status === "pending" && !isLcpCandidate;
  const showPlaceholder = showSkeleton && !isLcpCandidate && placeholderMounted;

  // Drop the placeholder once it has finished fading, to stop the shimmer
  // animating off-screen forever.
  useEffect(() => {
    if (!settled) return;
    const timer = setTimeout(() => setPlaceholderMounted(false), 400);
    return () => clearTimeout(timer);
  }, [settled]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setStatus("loaded");
    onLoad?.(e);
  };

  // A failed image is revealed rather than hidden, so the browser can show
  // its alt text. Swallowing it leaves an empty box with nothing to read.
  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setStatus("error");
    onError?.(e);
  };

  const shimmerClass = dark ? "skeleton-shimmer-dark" : "skeleton-shimmer";

  const placeholder = showPlaceholder && (
    <div
      aria-hidden="true"
      className={`absolute inset-0 z-0 transition-opacity duration-300 pointer-events-none ${
        settled ? "opacity-0" : "opacity-100"
      } ${shimmerClass} ${skeletonClassName}`}
    />
  );

  const transitionClass = className.includes("transition")
    ? ""
    : "transition-opacity duration-300 ease-out";

  const imageElement = (
    <Image
      ref={handleRef}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      priority={priority}
      preload={preload}
      onLoad={handleLoad}
      onError={handleError}
      className={`${transitionClass} ${
        hidden ? "opacity-0" : "opacity-100"
      } ${className}`}
      {...props}
    />
  );

  if (fill) {
    if (containerClassName) {
      return (
        <div className={`relative overflow-hidden ${containerClassName}`}>
          {placeholder}
          {imageElement}
        </div>
      );
    }
    return (
      <>
        {placeholder}
        {imageElement}
      </>
    );
  }

  // No explicit size on the wrapper: the image carries width/height, which
  // already reserve the space, and a className like `h-11 w-auto` is meant to
  // override them. Pinning the wrapper to the raw numbers instead framed an
  // 11-unit-tall logo in a 256x220 box.
  return (
    <div
      className={`relative overflow-hidden ${containerClassName || "inline-block"}`}
    >
      {placeholder}
      {imageElement}
    </div>
  );
}
