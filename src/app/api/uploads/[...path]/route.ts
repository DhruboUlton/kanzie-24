import { NextResponse } from "next/server";
import { stat } from "fs/promises";
import { createReadStream } from "fs";
import { extname } from "path";
import { Readable } from "stream";
import { resolveUploadPath, UPLOAD_EXT_MIME } from "@/lib/uploads";

// Serves runtime-uploaded media from the persistent upload directory.
// These files live outside the app root (see src/lib/uploads.ts), so they
// aren't in Next's build-time public/ manifest and can't be served by the
// static handler.
export async function GET(
  req: Request,
  props: { params: Promise<{ path: string[] }> },
) {
  const { path } = await props.params;

  const filepath = resolveUploadPath(path);
  if (!filepath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = extname(filepath).slice(1).toLowerCase();
  const contentType = UPLOAD_EXT_MIME[ext];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(filepath);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const rangeHeader = req.headers.get("range");

    // Range requests for video streaming / seeking. RFC 7233 §2.1: a
    // range is "bytes=start-end", "bytes=start-" (start to EOF), or
    // "bytes=-suffixLength" (last N bytes) — the suffix form has no
    // `start`, and an `end` at or past EOF is clamped, not rejected.
    // Real players send both: Safari/HLS probe "bytes=0-", and a suffix
    // range is the standard way to grab the trailing MOOV atom of a
    // not-fast-start MP4/MOV before the rest has downloaded.
    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const [rawStart, rawEnd] = rangeHeader.slice(6).split("-");
      const isSuffix = rawStart === "";

      let start: number;
      let end: number;
      if (isSuffix) {
        const suffixLength = parseInt(rawEnd, 10);
        start = Math.max(0, info.size - suffixLength);
        end = info.size - 1;
      } else {
        start = parseInt(rawStart, 10);
        end = rawEnd ? Math.min(parseInt(rawEnd, 10), info.size - 1) : info.size - 1;
      }

      const valid =
        !isNaN(start) && !isNaN(end) && start >= 0 && start < info.size && start <= end;

      if (!valid) {
        return new NextResponse("Requested range not satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${info.size}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = createReadStream(filepath, { start, end });
      const webStream = Readable.toWeb(fileStream) as unknown as ReadableStream;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${info.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": contentType,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Standard response with Accept-Ranges
    const fileStream = createReadStream(filepath);
    const webStream = Readable.toWeb(fileStream) as unknown as ReadableStream;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
