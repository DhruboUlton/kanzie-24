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
          // The site is HTTPS-only already; this stops the first request of
          // a session going out in the clear. Two years, subdomains
          // included. No `preload` — that is a one-way door: getting off
          // the browser-baked preload list takes months.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          // Severs the window.opener link to anything this site opens, so a
          // popup cannot reach back into the page. allow-popups rather than
          // plain same-origin because a payment gateway or social login
          // added later will need its own window to talk back.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
