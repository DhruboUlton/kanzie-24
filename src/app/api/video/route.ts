import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const driveId = searchParams.get("driveId");
  const videoUrl = searchParams.get("url");

  if (!driveId && !videoUrl) {
    return new NextResponse("Missing video source", { status: 400 });
  }

  // Check if we already have it in public/videos
  if (driveId) {
    const localPath = path.join(process.cwd(), "public", "videos", `${driveId}.mp4`);
    if (fs.existsSync(localPath)) {
      return NextResponse.redirect(new URL(`/videos/${driveId}.mp4`, request.url));
    }

    // Try downloading to cache
    try {
      const downloadUrl = `https://drive.usercontent.google.com/download?id=${driveId}&export=download`;
      const res = await fetch(downloadUrl);
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
  }

  const targetUrl = driveId
    ? `https://drive.usercontent.google.com/download?id=${driveId}&export=download`
    : videoUrl!;

  const rangeHeader = request.headers.get("range");
  const forwardHeaders: HeadersInit = {};
  if (rangeHeader) {
    forwardHeaders["Range"] = rangeHeader;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
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
