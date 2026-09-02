// Where an admin is sent after signing in.
//
// The `from` query parameter is set by middleware, but by the time it comes
// back it is just a string an attacker can put in a link. Both the server
// redirect on the login page and the client `router.push` after a successful
// sign-in run it through here first — a crafted
// `/admin/login?from=https://evil.example/` would otherwise hand a freshly
// authenticated admin to a look-alike page asking them to "sign in again".
//
// No `import "server-only"` on purpose: the login form is a client component
// and needs the same rule, and there is nothing secret in it.

const DEFAULT_DESTINATION = "/admin";

export function safeAdminDestination(raw: string | null | undefined): string {
  if (typeof raw !== "string") return DEFAULT_DESTINATION;

  // Only ever a same-origin path under /admin. `//host` is protocol-relative
  // and `://` catches absolute URLs; a backslash is normalised to a slash by
  // browsers, so `/\evil.example` has to go too.
  if (
    !raw.startsWith("/admin") ||
    raw.startsWith("//") ||
    raw.startsWith("/\\") ||
    raw.includes("://") ||
    raw.includes("\\")
  ) {
    return DEFAULT_DESTINATION;
  }

  // "/adminfoo" is not under /admin — only the path itself or a child of it.
  const next = raw.charAt("/admin".length);
  if (next !== "" && next !== "/" && next !== "?" && next !== "#") {
    return DEFAULT_DESTINATION;
  }

  return raw;
}
