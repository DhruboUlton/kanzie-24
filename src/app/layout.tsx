import type { Metadata } from "next";
import { Poppins, Lato } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site-config";
import { composeTabTitle, getSiteIdentity } from "@/lib/site-identity";
import JsonLd from "@/components/JsonLd";
import { jsonLdGraph, organizationSchema, webSiteSchema } from "@/lib/structured-data";

const poppins = Poppins({
  variable: "--font-heading",
  weight: ["600", "700", "800"],
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

// Read per render rather than fixed at build: the tab title, tagline and
// favicon are editable in /adpnl/settings. Storefront pages are static, so
// this resolves once at build for them — updateSettingsAction revalidates
// the root layout so a change actually reaches them.
export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentity();
  const title = composeTabTitle(identity);
  return {
    // Lets every page below express canonicals and OG images as paths.
    metadataBase: new URL(SITE_URL),
    title,
    description: SITE_TAGLINE,
    icons: { icon: identity.favicon },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description: SITE_TAGLINE,
      url: SITE_URL,
      images: [{ url: "/kanzie-logo.png", alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: SITE_TAGLINE,
      images: ["/kanzie-logo.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        // Uncapped so a summary or preview can quote the page in full,
        // which is what an answer engine needs to cite it.
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${lato.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {/* Identity for the whole site, stated once. */}
        <JsonLd data={jsonLdGraph(organizationSchema(), webSiteSchema())} />
        {children}
      </body>
    </html>
  );
}
