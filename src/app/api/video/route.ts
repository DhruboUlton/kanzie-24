import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

// Streams (and caches) a Google Drive video for the storefront player.
//
// This endpoint is public — no admin session is involved — so it must never
// fetch a host the caller picked. It used to accept a free-form `?url=`,
// which turned it into a full-read SSRF proxy: `?url=http://127.0.0.1:3000/`
// or a cloud metadata address came straight back to the caller. Nothing in
// the app ever produced that parameter (`parseVideoUrl` only ever emits
// `/api/video?driveId=<id>`), so the branch is gone rather than filtered.
//
// The remaining input is the Drive file id, which is also used to build a
// path under public/videos. Unvalidated it allowed `../` to escape that
// directory, so it is matched against Drive's own id alphabet first.
const DRIVE_ID = /^[A-Za-z0-9_-]{10,128}$/;

function driveDownloadUrl(driveId: string): string {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
    driveId,
  )}&export=download`;
}

export async function GET(request: NextRequest) {
  const driveId = request.nextUrl.searchParams.get("driveId");

  if (!driveId) {
    return new NextResponse("Missing video source", { status: 400 });
  }
  if (!DRIVE_ID.test(driveId)) {
    return new NextResponse("Invalid video source", { status: 400 });
  }

  // Check if we already have it in public/videos
  const localPath = path.join(process.cwd(), "public", "videos", `${driveId}.mp4`);
  if (fs.existsSync(localPath)) {
    return NextResponse.redirect(new URL(`/videos/${driveId}.mp4`, request.url));
  }

  // Try downloading to cache
  try {
    const res = await fetch(driveDownloadUrl(driveId));
    if (res.ok && res.body) {
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      const fileStream = fs.createWriteStream(localPath);
      // @ts-expect-error stream conversion
      await pipeline(Readable.fromWeb(res.body), fileStream);
      return NextResponse.redirect(new URL(`/videos/${driveId}.mp4`, request.url));
    }
  } catch (err) {
    console.warn("Failed to cache drive video locally:", err);
  }

  const rangeHeader = request.headers.get("range");
  const forwardHeaders: HeadersInit = {};
  if (rangeHeader) {
    forwardHeaders["Range"] = rangeHeader;
  }

  try {
    const upstreamRes = await fetch(driveDownloadUrl(driveId), {
      headers: forwardHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse("Failed to fetch video", { status: upstreamRes.status });
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      upstreamRes.headers.get("content-type") || "video/mp4"
    );
    responseHeaders.set("Accept-Ranges", "bytes");

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    responseHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("Video stream error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
