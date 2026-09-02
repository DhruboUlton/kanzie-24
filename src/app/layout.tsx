import type { Metadata } from "next";
import { Poppins, Lato } from "next/font/google";
import "./globals.css";
import { SITE_TAGLINE } from "@/lib/site-config";
import { composeTabTitle, getSiteIdentity } from "@/lib/site-identity";

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
// favicon are editable in /admin/settings. Storefront pages are static, so
// this resolves once at build for them — updateSettingsAction revalidates
// the root layout so a change actually reaches them.
export async function generateMetadata(): Promise<Metadata> {
  const identity = await getSiteIdentity();
  return {
    title: composeTabTitle(identity),
    description: SITE_TAGLINE,
    icons: { icon: identity.favicon },
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
        {children}
      </body>
    </html>
  );
}
