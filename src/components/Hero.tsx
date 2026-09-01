import HeroSlider from "@/components/HeroSlider";
import HeroBannerSlider from "@/components/HeroBannerSlider";
import { HeroContent, hasRenderableBanner } from "@/lib/hero";

// One hero renders, never both — content.mode decides. Banner mode with no
// images yet falls back to the coverflow rather than leaving the top of the
// homepage empty, so selecting the mode before uploading is harmless.
export default function Hero({ content }: { content: HeroContent }) {
  return hasRenderableBanner(content) ? (
    <HeroBannerSlider content={content} />
  ) : (
    <HeroSlider content={content} />
  );
}
