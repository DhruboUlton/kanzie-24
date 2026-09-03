import "server-only";
import { join, resolve, sep } from "path";

// Uploaded media must NOT live inside the deployed app directory. Hostinger
// ships each deploy into a fresh hbuilds/versions/<uuid>/ folder, repoints
// `current` at it, and prunes the previous one — so anything written under
// the app root (the old public/uploads/) is destroyed on the next deploy.
//
// Resolution order:
//   1. UPLOAD_DIR            — explicit, wins everywhere
//   2. $HOME/uploads (prod)  — on Hostinger HOME is the *domain* directory
//                              (/home/<user>/domains/<site>), which sits
//                              above hbuilds/ and survives deploys
//   3. public/uploads        — local development
export function getUploadDir(): string {
  if (process.env.UPLOAD_DIR) return resolve(process.env.UPLOAD_DIR);
  if (process.env.NODE_ENV === "production" && process.env.HOME) {
    return resolve(join(process.env.HOME, "uploads"));
  }
  return resolve(join(process.cwd(), "public", "uploads"));
}

// Extension is derived from the validated mime type, never from the
// client-supplied filename.
export const UPLOAD_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
};

export const UPLOAD_EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogv: "video/ogg",
};

// Joins a request path onto the upload directory, refusing anything that
// escapes it (traversal via .. or an absolute segment).
export function resolveUploadPath(segments: string[]): string | null {
  const dir = getUploadDir();
  const target = resolve(join(dir, ...segments));
  if (target !== dir && !target.startsWith(dir + sep)) return null;
  return target;
}
