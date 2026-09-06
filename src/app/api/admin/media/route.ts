import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID, createHash } from "crypto";
import { getAdminContext } from "@/lib/auth";
import { getUploadDir, UPLOAD_MIME_EXT } from "@/lib/uploads";
import { Permission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

const UPLOAD_PERMISSIONS: Permission[] = [
  "PRODUCTS_CREATE",
  "PRODUCTS_EDIT",
  "BANNER_MANAGE",
  "MEDIA_UPLOAD",
];

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.roleKey !== "OWNER" && !ctx.permissions.includes("MEDIA_VIEW")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "ALL";
  const sort = searchParams.get("sort") || "newest";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "40", 10)));

  const where: any = {};
  if (type === "IMAGE" || type === "VIDEO") {
    where.type = type;
  }

  if (search.trim()) {
    const term = search.trim();
    where.OR = [
      { filename: { contains: term } },
      { title: { contains: term } },
      { altText: { contains: term } },
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "oldest") orderBy = { createdAt: "asc" };
  else if (sort === "name_asc") orderBy = { filename: "asc" };
  else if (sort === "size_desc") orderBy = { size: "desc" };

  try {
    const total = await db.media.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;

    const items = await db.media.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        _count: {
          select: { productMedia: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        ...item,
        usageCount: item._count.productMedia,
      })),
      total,
      page,
      totalPages,
    });
  } catch (error: any) {
    console.error("GET /api/admin/media error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load media items" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasPerm =
    ctx.roleKey === "OWNER" ||
    UPLOAD_PERMISSIONS.some((p) => ctx.permissions.includes(p));

  if (!hasPerm) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    // Support either multiple files under "files" or single file under "file"
    const files = formData.getAll("files") as File[];
    if (files.length === 0) {
      const single = formData.get("file") as File | null;
      if (single) files.push(single);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate every file and read its bytes before touching disk or the
    // database — a batch either fully proceeds or fails clean, never leaves
    // earlier files in the same request half-saved when a later one is bad.
    const prepared: { file: File; buffer: Buffer; hash: string; ext: string; isVideo: boolean }[] = [];

    for (const file of files) {
      const ext = UPLOAD_MIME_EXT[file.type];
      if (!ext) {
        return NextResponse.json(
          {
            error: `Invalid file type: ${file.type || file.name}. Allowed: Images (JPEG, PNG, WebP, GIF, AVIF) or Videos (MP4, WebM, MOV, OGG).`,
          },
          { status: 400 }
        );
      }

      const isVideo = file.type.startsWith("video/");
      const maxSizeBytes = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      const maxLimitLabel = isVideo ? "100MB" : "10MB";

      if (file.size > maxSizeBytes) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds ${maxLimitLabel} limit.` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const hash = createHash("sha256").update(buffer).digest("hex");
      prepared.push({ file, buffer, hash, ext, isVideo });
    }

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const results = [];

    for (const { file, buffer, hash, ext, isVideo } of prepared) {
      // Dedup by content hash, not name/size/mime — two different files can
      // share a name and byte count, but never a sha256 digest.
      const existingMedia = await db.media.findFirst({
        where: { contentHash: hash },
      });

      if (existingMedia) {
        results.push(existingMedia);
        continue;
      }

      // Generate server filename
      const savedFilename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
      await writeFile(join(uploadDir, savedFilename), buffer);

      const url = `/api/uploads/${savedFilename}`;
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      const media = await db.media.create({
        data: {
          type: isVideo ? "VIDEO" : "IMAGE",
          url,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          contentHash: hash,
          title,
          altText: title,
        },
      });

      results.push(media);

      await logActivity({
        actor: ctx,
        action: "MEDIA_UPLOADED",
        entityType: "MEDIA",
        entityId: media.id,
        description: `Uploaded media file: ${file.name}`,
        metadata: { url: media.url, size: media.size, type: media.type },
      });
    }

    return NextResponse.json({
      success: true,
      media: results.length === 1 ? results[0] : results,
      items: results,
      // Provide legacy url compatibility for existing uploaders
      url: results[0]?.url,
    });
  } catch (error: any) {
    console.error("POST /api/admin/media error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload media" },
      { status: 500 }
    );
  }
}
