const QUOTES = [
  {
    quote:
      "My son runs the excavator in the backyard every single day after school. The bucket actually scoops — it's not just a toy that rolls around.",
    name: "Marcus T.",
  },
  {
    quote:
      "Bought the excavator and dump truck together so they'd match. Battery life is solid and the remotes don't interfere with each other.",
    name: "Priya R.",
  },
  {
    quote:
      "Sturdier than I expected for the price. Survived a summer of sandbox abuse from a 7-year-old.",
    name: "Dan K.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-paper py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid sm:grid-cols-3 gap-8">
        {QUOTES.map((t) => (
          <figure key={t.name} className="text-center">
            <blockquote className="text-black/70 italic leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-4 font-display tracking-wide text-sm text-black/50">
              {t.name.toUpperCase()}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
