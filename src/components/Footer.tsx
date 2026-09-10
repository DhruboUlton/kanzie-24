import Link from "next/link";
import { PackageSearch } from "lucide-react";
import type { CategoryNode } from "@/lib/products";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site-config";
import Newsletter from "@/components/Newsletter";

// Takes the tree the layout already fetched rather than reading again. It
// used to map a hardcoded CATEGORIES list, which linked to excavators,
// dump-trucks and bulldozers --- three categories this shop does not have.
export default function Footer({ tree }: { tree: CategoryNode[] }) {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-2 sm:grid-cols-4 gap-8">
        <div>
          <div className="mb-4">
            <Link
              href="/track"
              className="inline-flex items-center gap-2 px-3 py-2 rounded border-2 border-accent text-white font-semibold hover:bg-accent transition-colors"
            >
              <PackageSearch className="w-4 h-4" />
              <span>Track your order</span>
            </Link>
          </div>

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
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="hover:text-accent transition-colors"
              >
                Contact us
              </a>
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
            <li>About us</li>
            <li>Careers</li>
            <li>Press</li>
          </ul>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <h3 className="font-display text-white tracking-wide mb-4">
            NEWSLETTER
          </h3>
          <Newsletter compact />
        </div>
      </div>

      <div className="border-t border-white/10 py-6 text-center text-xs text-white/60">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
