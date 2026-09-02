import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { getAdminContext } from "@/lib/auth";
import { getUploadDir, UPLOAD_MIME_EXT } from "@/lib/uploads";
import { Permission } from "@/lib/permissions";

// The screens that upload: the product form, the hero/coverflow banner
// editors, and the body banner form.
const UPLOAD_PERMISSIONS: Permission[] = [
  "PRODUCTS_CREATE",
  "PRODUCTS_EDIT",
  "BANNER_MANAGE",
];

export async function POST(req: NextRequest) {
  // getAdminContext(), not getSession(): the cookie's signature alone stays
  // valid for seven days, so a session-only check let a deactivated or
  // deleted staff member keep uploading long after their access was pulled.
  // This resolves the account against the database on every request, the
  // same way every server action does.
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!UPLOAD_PERMISSIONS.some((p) => ctx.permissions.includes(p))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = UPLOAD_MIME_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, GIF, and AVIF are allowed." },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    // Filename is generated server-side — the client's name is never used
    // for the path, and the extension comes from the validated mime type.
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    await writeFile(join(uploadDir, filename), buffer);

    // Served by /api/uploads/[...path], not from public/ — files written at
    // runtime aren't in Next's build-time asset manifest, so the static
    // handler (and next/image's optimizer) can't see them.
    return NextResponse.json({ url: `/api/uploads/${filename}`, success: true });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
      { status: 500 }
    );
  }
}
