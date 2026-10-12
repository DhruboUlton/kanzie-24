import Link from "next/link";
import Hero from "@/components/Hero";
import { getHeroContent } from "@/lib/hero";
import { getBodyBannerContent } from "@/lib/body-banner";
import { getBrandStrip } from "@/lib/brand-strip";
import { getVideoBanner } from "@/lib/video-banner";
import { getReels } from "@/lib/reels";
import FeatureBanner from "@/components/FeatureBanner";
import VideoBanner from "@/components/VideoBanner";
import Reels from "@/components/Reels";
import ProductCard from "@/components/ProductCard";
import CategoryTiles from "@/components/CategoryTiles";
import BrandLogoStrip from "@/components/BrandLogoStrip";
import ArticleTeasers from "@/components/ArticleTeasers";
import Testimonials from "@/components/Testimonials";
import { getTestimonials } from "@/lib/testimonials";
import {
  getFeaturedProducts,
  getNewArrivals,
  getProducts,
  getCategories,
} from "@/lib/products";

export default async function Home() {
  const [
    featured,
    newArrivals,
    allProducts,
    categories,
    heroContent,
    bodyBanner,
    brandStrip,
    videoBanner,
    reels,
    testimonials,
  ] = await Promise.all([
    getFeaturedProducts(),
    getNewArrivals(),
    getProducts(),
    getCategories(),
    getHeroContent(),
    getBodyBannerContent(),
    getBrandStrip(),
    getVideoBanner(),
    getReels(),
    getTestimonials(true),
  ]);

  // Which categories get a product rail on the front page, chosen in
  // /adpnl/categories. Only the rails: the "Shop by machine" strip above
  // them always lists everything. Undefined counts as shown, so a row
  // written before the flag existed, or a fallback category with no database
  // row at all, still gets its rail.
  const railCategories = categories.filter((c) => c.showOnHomepage !== false);

  return (
    <>
      <Hero content={heroContent} />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-center mb-10">
          FEATURED MACHINES
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </section>

      <FeatureBanner content={bodyBanner} />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-center mb-10">
          NEW ARRIVALS
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </section>

      <BrandLogoStrip content={brandStrip} />

      {/* Every category, always. This strip is how a shopper browses the
          whole catalogue, so it stays complete no matter which categories
          were chosen to get a product rail below. */}
      <CategoryTiles categories={categories} products={allProducts} />

      <VideoBanner content={videoBanner} />

      {railCategories.map((category) => {
        const categoryProducts = allProducts
          .filter((p) => p.category === category.slug)
          .slice(0, 4);
        if (categoryProducts.length === 0) return null;
        return (
          <section
            key={category.slug}
            className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl sm:text-3xl tracking-wide">
                {category.name.toUpperCase()}
              </h2>
              <Link
                href={`/products?category=${category.slug}`}
                // Every rail on this page has a "View all", so the visible
                // text alone leaves a screen reader with three identical
                // links to three different places.
                aria-label={`View all ${category.name}`}
                className="text-sm font-semibold text-accent hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-10">
              {categoryProducts.map((product) => (
                <ProductCard key={product.id} product={product} compact />
              ))}
            </div>
          </section>
        );
      })}

      {reels.reels.length > 0 && <Reels content={reels} />}

      <Testimonials items={testimonials} />
      <ArticleTeasers />
    </>
  );
}
