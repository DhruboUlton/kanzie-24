// Converts a pasted YouTube or Google Drive share link into an embeddable
// iframe src. Product owners paste whatever URL the site they got the link
// from gives them (a "watch" page, a share link, an app-copied link) — this
// is the one place that has to know every shape those take.
export function getEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.pathname.startsWith("/embed/")) {
      return `https://www.youtube.com${parsed.pathname}`;
    }
    if (parsed.pathname.startsWith("/shorts/")) {
      const id = parsed.pathname.split("/")[2];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  }

  if (host === "drive.google.com") {
    // /file/d/<ID>/view or /file/d/<ID>/preview
    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
    // /open?id=<ID>
    const openId = parsed.searchParams.get("id");
    if (parsed.pathname === "/open" && openId) {
      return `https://drive.google.com/file/d/${openId}/preview`;
    }
    return null;
  }

  return null;
}
