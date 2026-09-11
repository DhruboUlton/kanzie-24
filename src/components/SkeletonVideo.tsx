"use client";

import { useCallback, useEffect, useRef, useState, type VideoHTMLAttributes } from "react";

export interface SkeletonVideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  containerClassName?: string;
  skeletonClassName?: string;
  dark?: boolean;
  ref?: React.Ref<HTMLVideoElement>;
}

/** Matches SkeletonImage: "unknown" is what the server renders, and shows. */
type Status = "unknown" | "pending" | "ready" | "error";

/**
 * SkeletonVideo: HTML5 video element with a dark shimmer skeleton
 * until metadata / first frame is loaded and ready to play.
 */
export default function SkeletonVideo({
  ref,
  containerClassName = "",
  skeletonClassName = "",
  dark = true,
  className = "",
  onLoadedData,
  onCanPlay,
  onPlaying,
  onError,
  ...props
}: SkeletonVideoProps) {
  const [status, setStatus] = useState<Status>("unknown");
  const [placeholderMounted, setPlaceholderMounted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref && "current" in ref) {
        (ref as React.MutableRefObject<HTMLVideoElement | null>).current = node;
      }
      if (!node) return;
      // readyState >= 2 is HAVE_CURRENT_DATA: a frame is already decoded, so
      // the event fired before React could listen for it.
      setStatus(node.readyState >= 2 ? "ready" : "pending");
    },
    [ref]
  );

  const settled = status === "ready" || status === "error";

  useEffect(() => {
    if (!settled) return;
    const timer = setTimeout(() => setPlaceholderMounted(false), 400);
    return () => clearTimeout(timer);
  }, [settled]);

  const markReady = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setStatus("ready");
    return e;
  };

  const handleLoadedData = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    onLoadedData?.(markReady(e));
  };

  const handleCanPlay = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    onCanPlay?.(markReady(e));
  };

  const handlePlaying = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    onPlaying?.(markReady(e));
  };

  // A video that cannot load is shown anyway, so its own controls report the
  // failure rather than the page sitting on a shimmer that never resolves.
  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setStatus("error");
    onError?.(e);
  };

  const shimmerClass = dark ? "skeleton-shimmer-dark" : "skeleton-shimmer";

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {placeholderMounted && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 z-0 transition-opacity duration-300 pointer-events-none ${
            settled ? "opacity-0" : "opacity-100"
          } ${shimmerClass} ${skeletonClassName}`}
        />
      )}
      <video
        ref={handleRef}
        onLoadedData={handleLoadedData}
        onCanPlay={handleCanPlay}
        onPlaying={handlePlaying}
        onError={handleError}
        className={`relative z-10 transition-opacity duration-300 ${
          status === "pending" ? "opacity-0" : "opacity-100"
        } ${className}`}
        {...props}
      />
    </div>
  );
}
