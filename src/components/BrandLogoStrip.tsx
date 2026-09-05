// Decorative wordmark strip — placeholder logos (fictional, not real
// companies) matching the reference theme's demo brand row. Swap for real
// press mentions or retailer logos once you have them.
const MARKS = [
  { name: "Backyard Builder", className: "font-display tracking-wide" },
  { name: "Kidville Times", className: "font-serif italic" },
  { name: "PlayScout", className: "font-sans font-black" },
  { name: "The Toy Weekly", className: "font-serif" },
  { name: "Rugged & Little", className: "font-display tracking-widest" },
];

export default function BrandLogoStrip() {
  return (
    <section className="border-y border-black/10 bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {MARKS.map((mark) => (
          <span
            key={mark.name}
            className={`text-xl sm:text-2xl text-black/55 hover:text-black/60 transition-colors select-none ${mark.className}`}
          >
            {mark.name}
          </span>
        ))}
      </div>
    </section>
  );
}
