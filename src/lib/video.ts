export type VideoInfo =
  | {
      type: "youtube";
      id: string;
      embedUrl: string;
    }
  | {
      type: "direct";
      src: string;
    }
  | {
      type: "drive";
      id: string;
      directUrl: string;
      fallbackEmbedUrl: string;
    };

// Converts a pasted YouTube, Google Drive share link, or direct video file into playable info.
export function parseVideoUrl(url: string): VideoInfo | null {
  if (!url) return null;

  // Direct video file path or relative URL
  if (url.startsWith("/") || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return { type: "direct", src: url };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    if (!id) return null;
    return {
      type: "youtube",
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}&enablejsapi=1`,
    };
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    let id: string | null = null;
    if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.split("/")[2];
    } else if (parsed.pathname.startsWith("/shorts/")) {
      id = parsed.pathname.split("/")[2];
    }
    if (!id) return null;
    return {
      type: "youtube",
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}&enablejsapi=1`,
    };
  }

  if (host === "drive.google.com") {
    let id: string | null = null;
    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch) {
      id = fileMatch[1];
    } else if (parsed.pathname === "/open") {
      id = parsed.searchParams.get("id");
    }
    if (!id) return null;
    return {
      type: "drive",
      id,
      directUrl: `/api/video?driveId=${id}`,
      fallbackEmbedUrl: `https://drive.google.com/file/d/${id}/preview`,
    };
  }

  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(parsed.pathname)) {
    return { type: "direct", src: url };
  }

  return null;
}

export function getEmbedUrl(url: string): string | null {
  const info = parseVideoUrl(url);
  if (!info) return null;
  if (info.type === "youtube") return info.embedUrl;
  if (info.type === "drive") return info.fallbackEmbedUrl;
  return info.src;
}
