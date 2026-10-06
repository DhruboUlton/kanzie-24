import type { Metadata } from "next";
import Link from "next/link";
import { Mail, PackageSearch } from "lucide-react";
import { FacebookIcon, InstagramIcon } from "@/components/SocialIcons";
import { SITE_NAME, SOCIAL_LINKS, SUPPORT_EMAIL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Get in touch with ${SITE_NAME} by email, Facebook or Instagram.`,
  alternates: { canonical: "/contact" },
};

const CHANNELS = [
  {
    label: "Email",
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    icon: Mail,
    external: false,
  },
  {
    label: "Facebook",
    value: "facebook.com/kanzieshop",
    href: SOCIAL_LINKS.facebook,
    icon: FacebookIcon,
    external: true,
  },
  {
    label: "Instagram",
    value: "@kanzie___",
    href: SOCIAL_LINKS.instagram,
    icon: InstagramIcon,
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-center">
        CONTACT US
      </h1>
      <p className="mt-4 text-center text-black/70">
        A question about a product, an order or delivery? Reach us on any of
        these.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {CHANNELS.map(({ label, value, href, icon: Icon, external }) => (
          <li key={label}>
            <a
              href={href}
              {...(external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="group flex h-full flex-col items-center gap-3 rounded-lg bg-white p-6 text-center shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white transition-colors group-hover:bg-accent">
                <Icon className="h-5 w-5" />
              </span>
              <span className="font-display tracking-wide">{label}</span>
              <span className="break-all text-sm text-black/60 group-hover:text-accent transition-colors">
                {value}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-black/60">
        <span>Already ordered?</span>
        <Link
          href="/track"
          className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
        >
          <PackageSearch className="h-4 w-4" />
          Track your order
        </Link>
      </p>
    </div>
  );
}
