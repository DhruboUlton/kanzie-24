import type { Metadata } from "next";
import Link from "next/link";

const INTRO =
  "KANZIE is a Bangladesh-based lifestyle and collectibles brand created for people who are fascinated by machines, models, characters, and the world of collecting.";

export const metadata: Metadata = {
  title: "About us",
  description: INTRO,
  alternates: { canonical: "/about" },
};

// The copy lives here as data rather than inline JSX so its apostrophes and
// dashes go through untouched: JSX text would need every one escaped.
type Section = {
  title: string;
  lead?: string;
  quote?: string;
  paragraphs: string[];
};

const SECTIONS: Section[] = [
  {
    title: "More Than Just a Toy",
    lead: "We believe collecting is personal.",
    paragraphs: [
      "Some people love the realism of a miniature construction machine. Some enjoy the excitement of controlling an RC vehicle. Others collect figures, models, or display pieces simply because they appreciate the design.",
      "Whatever draws you in, KANZIE is here to make that experience easier and more exciting.",
      "We carefully explore products from different categories and select items based on their design, functionality, detail, quality, and overall experience—not simply because they are trending.",
    ],
  },
  {
    title: "Our Vision",
    paragraphs: [
      "Our vision is to build one of Bangladesh's most trusted destinations for RC, collectibles, and hobby products.",
      "We want KANZIE to become a place where enthusiasts can discover interesting products, start a collection, find something unique, and connect with a community that shares the same passion.",
      "As we grow, our goal is to expand beyond individual products and build a complete ecosystem around hobbies and collecting.",
    ],
  },
];

const VALUES = [
  {
    title: "Quality Over Quantity",
    body: "We don't want to fill our store with thousands of random products. We prefer a carefully selected collection of products worth owning.",
  },
  {
    title: "Detail Matters",
    body: "From realistic designs to functional features, we appreciate the small details that make a product special.",
  },
  {
    title: "Curiosity Drives Us",
    body: "We're always looking for interesting products, emerging hobbies, and new categories that deserve attention.",
  },
  {
    title: "Built for Enthusiasts",
    body: "Whether you're a longtime collector or buying your first RC model, KANZIE is for anyone who enjoys discovering and owning something different.",
  },
];

const JOURNEY: Section = {
  title: "Our Journey",
  lead: "KANZIE started with a simple idea:",
  quote: "Why should finding great hobby and collectible products be difficult?",
  paragraphs: [
    "We wanted to create a brand that makes discovering these products easier for people in Bangladesh—while maintaining a shopping experience that feels trustworthy, modern, and enjoyable.",
    "Today, we're starting with a curated selection of RC vehicles, construction models, military vehicles, diecast, and collectibles.",
    "And this is only the beginning.",
  ],
};

function SectionBlock({ section }: { section: Section }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl sm:text-3xl tracking-wide">
        {section.title.toUpperCase()}
      </h2>
      {section.lead && (
        <p className="mt-4 text-lg font-semibold text-ink">{section.lead}</p>
      )}
      {section.quote && (
        <blockquote className="mt-4 border-l-4 border-accent pl-5 font-display text-xl sm:text-2xl tracking-wide">
          {section.quote}
        </blockquote>
      )}
      <div className="mt-4 space-y-4 leading-relaxed text-black/70">
        {section.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          About us
        </p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl tracking-wide">
          ABOUT KANZIE
        </h1>
        <p className="mt-4 text-xl sm:text-2xl text-ink">
          Built for people who appreciate the details.
        </p>
      </header>

      <div className="mt-10 space-y-4 leading-relaxed text-black/70">
        <p>{INTRO}</p>
        <p>
          From detailed RC vehicles and construction machines to diecast models,
          action figures, and unique collectibles, we bring together products
          that are made to be more than just things you own—they are things you
          enjoy.
        </p>
      </div>

      <SectionBlock section={SECTIONS[0]} />
      <SectionBlock section={SECTIONS[1]} />

      <section className="mt-14">
        <h2 className="font-display text-2xl sm:text-3xl tracking-wide">
          WHAT WE STAND FOR
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <li key={v.title} className="rounded-lg bg-white p-6 shadow-sm">
              <h3 className="font-display tracking-wide text-lg">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-black/70">
                {v.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <SectionBlock section={JOURNEY} />

      <div className="mt-14 rounded-lg bg-ink px-6 py-10 text-center text-white">
        <p className="font-display text-2xl sm:text-3xl tracking-wide">
          DISCOVER SOMETHING WORTH COLLECTING.
        </p>
        <p className="mt-2 text-white/70">Welcome to KANZIE.</p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded bg-accent px-6 py-3 font-display tracking-wide text-white transition-colors hover:bg-accent-dark"
        >
          SHOP ALL PRODUCTS
        </Link>
      </div>
    </div>
  );
}
