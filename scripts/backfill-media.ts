import { PrismaClient } from "@prisma/client";
import { stat } from "fs/promises";
import { join } from "path";

const db = new PrismaClient();

async function backfill() {
  console.log("Starting media backfill...");
  const products = await db.product.findMany({
    select: { id: true, name: true, images: true, videoUrl: true, popupVideoUrl: true },
  });

  console.log(`Found ${products.length} products.`);

  for (const p of products) {
    const images: string[] = Array.isArray(p.images)
      ? (p.images as string[])
      : typeof p.images === "string"
      ? JSON.parse(p.images as string || "[]")
      : [];

    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      if (!url || typeof url !== "string") continue;

      let size = 50000;
      let filename = url.split("/").pop() || "image.jpg";
      let mimeType = "image/jpeg";
      if (url.endsWith(".png")) mimeType = "image/png";
      else if (url.endsWith(".webp")) mimeType = "image/webp";

      try {
        if (url.startsWith("/")) {
          const localPath = join(process.cwd(), "public", url);
          const s = await stat(localPath);
          size = s.size;
        }
      } catch {
        // Use default size if not found
      }

      let media = await db.media.findFirst({ where: { url } });
      if (!media) {
        media = await db.media.create({
          data: {
            type: "IMAGE",
            url,
            filename,
            mimeType,
            size,
            title: `${p.name} - Photo ${i + 1}`,
            altText: p.name,
          },
        });
      }

      // Link ProductMedia
      await db.productMedia.upsert({
        where: {
          productId_mediaId: {
            productId: p.id,
            mediaId: media.id,
          },
        },
        update: {
          sortOrder: i,
          isPrimary: i === 0,
        },
        create: {
          productId: p.id,
          mediaId: media.id,
          sortOrder: i,
          isPrimary: i === 0,
        },
      });
    }

    // Check direct video uploads
    for (const vid of [p.videoUrl, p.popupVideoUrl]) {
      if (vid && (vid.startsWith("/api/uploads/") || vid.endsWith(".mp4") || vid.endsWith(".mov"))) {
        let media = await db.media.findFirst({ where: { url: vid } });
        if (!media) {
          media = await db.media.create({
            data: {
              type: "VIDEO",
              url: vid,
              filename: vid.split("/").pop() || "video.mp4",
              mimeType: "video/mp4",
              size: 5000000,
              title: `${p.name} - Video`,
              altText: `${p.name} Video`,
            },
          });
        }
        await db.productMedia.upsert({
          where: {
            productId_mediaId: {
              productId: p.id,
              mediaId: media.id,
            },
          },
          update: {},
          create: {
            productId: p.id,
            mediaId: media.id,
            sortOrder: 99,
            isPrimary: false,
          },
        });
      }
    }
  }

  const finalMediaCount = await db.media.count();
  const finalPMCount = await db.productMedia.count();
  console.log(`Backfill completed! Total Media: ${finalMediaCount}, Total ProductMedia relations: ${finalPMCount}`);
  await db.$disconnect();
}

backfill().catch((err) => {
  console.error("Backfill error:", err);
  process.exit(1);
});
