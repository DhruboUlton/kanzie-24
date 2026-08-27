import { Backpack, BatteryCharging, GitCompareArrows, Wrench } from "lucide-react";

// Editorial teasers — demo copy only, not wired to real posts yet.
const ARTICLES = [
  {
    icon: Backpack,
    title: "20 Backyard Play Ideas for Your Kid's RC Excavator",
    excerpt:
      "From sandbox job sites to snow-day plowing, ways to keep the machine busy all year.",
  },
  {
    icon: GitCompareArrows,
    title: "Excavator vs. Bulldozer vs. Dump Truck: Which One First?",
    excerpt:
      "A parent's guide to picking the right first machine — and what to add next.",
  },
  {
    icon: BatteryCharging,
    title: "Battery Care 101: Getting the Most Runtime",
    excerpt:
      "Charging habits and storage tips that keep rechargeable packs healthy for years.",
  },
  {
    icon: Wrench,
    title: "Why Kids Love Diggers: The Case for Construction Play",
    excerpt:
      "The hand-eye coordination and problem-solving behind all that scooping.",
  },
];

export default function ArticleTeasers() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <h2 className="font-display text-3xl sm:text-4xl tracking-wide text-center mb-10">
        RC TIPS & GUIDES
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {ARTICLES.map(({ icon: Icon, title, excerpt }) => (
          <div key={title} className="flex flex-col gap-3">
            <div className="w-11 h-11 rounded-full bg-paper flex items-center justify-center">
              <Icon className="text-accent" size={20} />
            </div>
            <h3 className="font-display text-lg tracking-wide leading-snug">
              {title}
            </h3>
            <p className="text-sm text-black/60 leading-relaxed">{excerpt}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
