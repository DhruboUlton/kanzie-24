/** @type {import('next').NextConfig} */
const nextConfig = {
  // Baseline response hardening for every route. Deliberately conservative:
  // no Content-Security-Policy here, because the Integrations feature injects
  // admin-authored third-party scripts (GTM, Meta/TikTok pixels) at runtime
  // and a strict CSP would break them — that needs a nonce/allowlist design
  // of its own before it can ship.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: the admin and storefront are never meant to be
          // framed by another origin.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop the browser guessing a different Content-Type than we send,
          // which is what turns a mis-served upload into an XSS vector.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
