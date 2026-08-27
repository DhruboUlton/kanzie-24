import Image from "next/image";
import Link from "next/link";

const PANELS = [
  {
    eyebrow: "EXCAVATE",
    title: "DIG. HAUL. BUILD.",
    tagline: "Real hydraulics, real dirt, real fun.",
    image: "/hero/jcb-backhoe-loader-2.png",
    bg: "bg-ink",
    text: "text-white",
  },
  {
    eyebrow: "REMOTE CONTROL",
    title: "FULL CONTROL, EVERY MOVE",
    tagline: "2.4GHz remotes — precision at your fingertips.",
    image: "/hero/jcb-backhoe-loader-1.png",
    bg: "bg-paper",
    text: "text-ink",
  },
];

export default function FeatureBanner() {
  return (
    <section className="grid sm:grid-cols-2">
      {PANELS.map((panel) => (
        <div
          key={panel.title}
          className={`relative flex flex-col items-center text-center gap-4 px-8 py-16 sm:py-24 ${panel.bg} ${panel.text}`}
        >
          <div className="relative w-56 h-56 sm:w-72 sm:h-72">
            <Image
              src={panel.image}
              alt=""
              fill
              sizes="(min-width: 640px) 25vw, 60vw"
              className="object-contain"
            />
          </div>
          <p className="text-xs font-semibold tracking-widest opacity-60">
            {panel.eyebrow}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide">
            {panel.title}
          </h2>
          <p className="opacity-70 text-sm max-w-xs">{panel.tagline}</p>
          <Link
            href="/products"
            className="text-accent font-semibold text-sm hover:underline"
          >
            Shop now →
          </Link>
        </div>
      ))}
    </section>
  );
}
