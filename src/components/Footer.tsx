import Link from "next/link";
import { PackageSearch } from "lucide-react";
import type { CategoryNode } from "@/lib/products";
import { SITE_NAME, SOCIAL_LINKS } from "@/lib/site-config";
import { FacebookIcon, InstagramIcon } from "@/components/SocialIcons";

// Takes the tree the layout already fetched rather than reading again. It
// used to map a hardcoded CATEGORIES list, which linked to excavators,
// dump-trucks and bulldozers --- three categories this shop does not have.
export default function Footer({ tree }: { tree: CategoryNode[] }) {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div>
          <h3 className="font-display text-white tracking-wide mb-4">
            SHOP
          </h3>
          <ul className="space-y-2 text-sm">
            {tree.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="hover:text-accent transition-colors"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/products"
                className="hover:text-accent transition-colors"
              >
                All products
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-white tracking-wide mb-4">
            HELP
          </h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/cart" className="hover:text-accent transition-colors">
                Cart
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="hover:text-accent transition-colors"
              >
                Contact us
              </Link>
            </li>
            <li className="text-white/60">Shipping & returns</li>
            <li className="text-white/60">Warranty</li>
          </ul>
        </div>

        <div>
          <h3 className="font-display text-white tracking-wide mb-4">
            COMPANY
          </h3>
          <ul className="space-y-2 text-sm text-white/60">
            <li>
              <Link
                href="/about"
                className="text-white/70 hover:text-accent transition-colors"
              >
                About us
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="text-white/70 hover:text-accent transition-colors"
              >
                Terms & Conditions
              </Link>
            </li>
            <li>
              <Link
                href="/careers"
                className="text-white/70 hover:text-accent transition-colors"
              >
                Careers
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <Link
            href="/track"
            className="inline-flex items-center gap-2 px-3 py-2 rounded border-2 border-accent text-white font-semibold hover:bg-accent transition-colors"
          >
            <PackageSearch className="w-4 h-4" />
            <span>Track your order</span>
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 py-6 flex flex-col items-center gap-4 text-xs text-white/60">
        <div className="flex items-center gap-3">
          {[
            { label: "Facebook", href: SOCIAL_LINKS.facebook, Icon: FacebookIcon },
            { label: "Instagram", href: SOCIAL_LINKS.instagram, Icon: InstagramIcon },
          ].map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${SITE_NAME} on ${label}`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/80 transition-colors hover:border-accent hover:bg-accent hover:text-white"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
        <span>
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
