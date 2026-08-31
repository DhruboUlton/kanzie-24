import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { getCategoryTree } from "@/lib/products";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nav is built from the live category tree so subcategories appear in
  // the dropdowns as soon as they're created in the admin.
  const tree = await getCategoryTree();

  return (
    <div className="min-h-full flex flex-col">
      <AnnouncementBar />
      <Header tree={tree} />
      <CartDrawer />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
