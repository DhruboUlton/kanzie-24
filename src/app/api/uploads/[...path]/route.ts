import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { extname } from "path";
import { resolveUploadPath, UPLOAD_EXT_MIME } from "@/lib/uploads";

// Serves runtime-uploaded media from the persistent upload directory.
// These files live outside the app root (see src/lib/uploads.ts), so they
// aren't in Next's build-time public/ manifest and can't be served by the
// static handler.
export async function GET(
  _req: Request,
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

    const data = await readFile(filepath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        // Filenames are unique per upload, so they're safe to cache hard.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
