import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import IntegrationScripts from "@/components/IntegrationScripts";
import { getCategoryTree } from "@/lib/products";
import { getEnabledIntegrations } from "@/lib/integrations";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nav is built from the live category tree so subcategories appear in
  // the dropdowns as soon as they're created in the admin.
  //
  // Tracking snippets are loaded here and nowhere else, which is what keeps
  // the admin panel out of GTM, Pixel and friends — /admin sits in its own
  // route group and never renders this layout.
  const [tree, integrations] = await Promise.all([
    getCategoryTree(),
    getEnabledIntegrations(),
  ]);

  return (
    <div className="min-h-full flex flex-col">
      <IntegrationScripts integrations={integrations} />
      <AnnouncementBar />
      <Header tree={tree} />
      <CartDrawer />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
