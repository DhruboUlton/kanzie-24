// Placeholder product catalog. Ships as a hardcoded array so the storefront
// has real data to render during development. Every read goes through the
// async functions below (not the array directly) so swapping this for a
// database call later (Postgres/Prisma on Hostinger) only touches this file.
//
// Photos in /public/products-dev/ are scraped local-preview placeholders
// (gitignored — see .gitignore) pulled in to see the catalog populated at
// localhost. They are NOT licensed for production use. Replace every
// `images` array with real supplier/product photography before deploying.

export type Category = {
  slug: string;
  name: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  category: string; // Category["slug"]
  priceCents: number;
  compareAtPriceCents?: number;
  scale: string;
  shortDescription: string;
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
  images: string[];
  featured: boolean;
  isNew?: boolean;
  inStock: boolean;
  // A YouTube (watch/youtu.be/embed) or Google Drive (file/d/... or
  // open?id=...) link. Optional — the product page only shows a video
  // button when this is set. See src/lib/video.ts for the embed-URL
  // conversion.
  videoUrl?: string;
};

export const CATEGORIES: Category[] = [
  { slug: "excavators", name: "Excavators" },
  { slug: "dump-trucks", name: "Dump Trucks" },
  { slug: "bulldozers", name: "Bulldozers" },
];

const PRODUCTS: Product[] = [
  // ── Excavators ──────────────────────────────────────────────
  {
    id: "1",
    slug: "yg258c-rc-excavator",
    name: "YG258C RC Hydraulic Excavator",
    brand: "YIGONG",
    sku: "YG258C",
    category: "excavators",
    priceCents: 12999,
    compareAtPriceCents: 15999,
    scale: "1:16",
    shortDescription:
      "Full-function remote control excavator with independent boom, arm, and bucket hydraulics, and a rotating cab.",
    description:
      "The YG258C brings real excavator motion to the sandbox: independent boom, arm, and bucket control, a 360° rotating upper cab, and metal-tone tracks that grip on sand, gravel, and dirt. Built for kids who want a toy that actually digs, not just rolls forward.",
    features: [
      "Full hydraulic-style boom, arm & bucket control",
      "360° cab rotation",
      "All-metal-look track drive",
      "2.4GHz remote — multiple units can run side by side",
      "LED work lights",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 6-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body, die-cast accents" },
      { label: "Recommended age", value: "6+" },
    ],
    images: ["/products-dev/excavators/01.jpg", "/products-dev/excavators/02.jpg"],
    featured: true,
    inStock: true,
  },
  {
    id: "4",
    slug: "compact-rc-mini-excavator",
    name: "Compact RC Mini Excavator",
    brand: "TOPRACE",
    sku: "TP-EX20",
    category: "excavators",
    priceCents: 6999,
    scale: "1:20",
    shortDescription:
      "Smaller-scale excavator sized for younger hands, with the same boom-arm-bucket motion as the full-size machines.",
    description:
      "A pint-sized starter excavator that keeps the core dig action — boom, arm, and bucket move independently — in a lighter, easier-to-grip build for younger operators graduating from push toys.",
    features: [
      "Lightweight body, easy for small hands",
      "Independent boom/arm/bucket control",
      "Simplified 2-channel remote",
      "Rubber-lugged wheels for indoor/outdoor use",
    ],
    specs: [
      { label: "Scale", value: "1:20" },
      { label: "Control", value: "2.4GHz remote, 2-channel" },
      { label: "Power", value: "AA batteries (not included) + rechargeable pack" },
      { label: "Material", value: "ABS body" },
      { label: "Recommended age", value: "4+" },
    ],
    images: ["/products-dev/excavators/03.jpg", "/products-dev/excavators/04.jpg"],
    videoUrl: "https://www.youtube.com/shorts/dqaWu4ZMGZ4",
    featured: true,
    isNew: true,
    inStock: true,
  },
  {
    id: "5",
    slug: "alloy-rc-crawler-excavator",
    name: "Alloy RC Crawler Excavator",
    brand: "DIGMASTER",
    sku: "DM-EX14A",
    category: "excavators",
    priceCents: 18999,
    compareAtPriceCents: 21999,
    scale: "1:14",
    shortDescription:
      "Metal-body upgrade excavator with a die-cast boom and arm for extra weight and durability.",
    description:
      "Steps up from ABS-only builds with a die-cast metal boom and arm — more heft, more durability, and a slower, more realistic dig motion. For kids (and parents) who've outgrown the plastic-only models.",
    features: [
      "Die-cast metal boom and arm",
      "Reinforced steel tracks",
      "Working bucket curl with metal linkages",
      "2.4GHz remote, low-interference multi-unit play",
    ],
    specs: [
      { label: "Scale", value: "1:14" },
      { label: "Control", value: "2.4GHz remote, 7-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "Die-cast metal boom/arm, ABS cab" },
      { label: "Recommended age", value: "8+" },
    ],
    images: ["/products-dev/excavators/05.jpg", "/products-dev/excavators/06.jpg"],
    featured: true,
    inStock: true,
  },
  {
    id: "6",
    slug: "rc-excavator-starter-pack",
    name: "RC Excavator Starter Pack",
    brand: "TOPRACE",
    sku: "TP-EX18",
    category: "excavators",
    priceCents: 5499,
    scale: "1:18",
    shortDescription:
      "Budget-friendly first excavator — simplified controls, still digs.",
    description:
      "An entry point for families testing the waters before committing to a full hydraulic rig. Simplified single-lever bucket control, easy on/off switch, and a price built for a first RC toy.",
    features: [
      "Single-lever bucket scoop control",
      "Simple on/off drive switch",
      "Durable one-piece ABS shell",
      "Runs on AA batteries — no charging wait",
    ],
    specs: [
      { label: "Scale", value: "1:18" },
      { label: "Control", value: "27MHz remote, 2-channel" },
      { label: "Power", value: "4x AA batteries (not included)" },
      { label: "Material", value: "ABS" },
      { label: "Recommended age", value: "3+" },
    ],
    images: ["/products-dev/excavators/07.jpg", "/products-dev/excavators/08.jpg"],
    featured: false,
    inStock: true,
  },
  {
    id: "7",
    slug: "rc-excavator-loader-combo",
    name: "RC Excavator & Loader Combo",
    brand: "DIGMASTER",
    sku: "DM-EX16C",
    category: "excavators",
    priceCents: 15999,
    scale: "1:16",
    shortDescription:
      "Two tools in one: a rear excavator arm and a front loader bucket on the same chassis.",
    description:
      "Backhoe-style build with a digging arm at the back and a loader bucket up front — dig a hole, then scoop and haul without swapping toys. A job-site-in-one machine for the kid who wants to do everything at once.",
    features: [
      "Rear excavator arm + front loader bucket",
      "Independent control for each end",
      "All-terrain tires",
      "LED work lights front and rear",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 8-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body, die-cast accents" },
      { label: "Recommended age", value: "6+" },
    ],
    images: ["/products-dev/excavators/09.jpg"],
    featured: false,
    inStock: true,
  },

  // ── Dump Trucks ─────────────────────────────────────────────
  {
    id: "2",
    slug: "yg258e-rc-dump-truck",
    name: "YG258-E RC Mining Dump Truck",
    brand: "YIGONG",
    sku: "YG258-E",
    category: "dump-trucks",
    priceCents: 8999,
    scale: "1:16",
    shortDescription:
      "Heavy-haul dump truck with a powered tipping bed and off-road tires — the excavator's loading partner.",
    description:
      "Matches the YG258C excavator in scale and finish so they run the same job site together. The bed tips fully under remote control to dump a real load of sand or gravel, and the wide off-road tires keep it planted outdoors.",
    features: [
      "Remote-controlled powered dump bed",
      "Wide-grip off-road tires",
      "Working headlights",
      "Reinforced steel-frame chassis",
      "2.4GHz remote",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 4-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body, steel-frame chassis" },
      { label: "Recommended age", value: "6+" },
    ],
    images: [
      "/products-dev/dump-trucks/01.jpg",
      "/products-dev/dump-trucks/02.jpg",
      "/products-dev/dump-trucks/03.jpg",
      "/products-dev/dump-trucks/04.jpg",
    ],
    featured: true,
    inStock: true,
  },
  {
    id: "8",
    slug: "rc-articulated-dump-truck",
    name: "RC Articulated Dump Truck",
    brand: "TRAXPRO",
    sku: "TX-DT20",
    category: "dump-trucks",
    priceCents: 9999,
    scale: "1:20",
    shortDescription:
      "Center-hinged chassis steers like the real thing, so it turns tight even fully loaded.",
    description:
      "A pivot-steer chassis — like real articulated haulers — lets this truck turn sharply without a big turning radius, even with a full bed. Handles backyard job sites with tight corners better than a rigid-frame truck.",
    features: [
      "Articulated (pivot-steer) chassis",
      "Remote-controlled dump bed",
      "Off-road tread tires",
      "2.4GHz remote",
    ],
    specs: [
      { label: "Scale", value: "1:20" },
      { label: "Control", value: "2.4GHz remote, 4-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body" },
      { label: "Recommended age", value: "6+" },
    ],
    images: [
      "/products-dev/dump-trucks/05.jpg",
      "/products-dev/dump-trucks/06.jpg",
      "/products-dev/dump-trucks/07.jpg",
      "/products-dev/dump-trucks/08.jpg",
    ],
    featured: true,
    inStock: true,
  },
  {
    id: "9",
    slug: "rc-tipper-dump-truck",
    name: "RC Tipper Dump Truck",
    brand: "YIGONG",
    sku: "YG-DT16T",
    category: "dump-trucks",
    priceCents: 7999,
    compareAtPriceCents: 9499,
    scale: "1:16",
    shortDescription:
      "Classic straight-frame tipper with a high-angle dump bed for a full, satisfying unload.",
    description:
      "A no-frills, high-angle tipper bed that dumps its full load in one smooth motion. Simple, sturdy, and the natural partner for any excavator or loader already in the fleet.",
    features: [
      "High-angle powered tipper bed",
      "Reinforced tailgate",
      "Chunky off-road tires",
      "2.4GHz remote",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 3-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body, steel-frame chassis" },
      { label: "Recommended age", value: "6+" },
    ],
    images: [
      "/products-dev/dump-trucks/09.jpg",
      "/products-dev/dump-trucks/10.jpg",
      "/products-dev/dump-trucks/11.jpg",
    ],
    featured: true,
    inStock: true,
  },
  {
    id: "10",
    slug: "rc-off-road-dump-truck-6x6",
    name: "RC Off-Road Dump Truck 6x6",
    brand: "TRAXPRO",
    sku: "TX-DT16-6X6",
    category: "dump-trucks",
    priceCents: 13999,
    scale: "1:16",
    shortDescription:
      "Six-wheel-drive hauler built for loose sand, gravel, and backyard terrain a 4-wheel truck would get stuck in.",
    description:
      "All six wheels driven means this one keeps moving where a standard 4-wheel dump truck bogs down — loose sand, mulch, gravel piles. Built for kids who play in terrain, not just on flat driveways.",
    features: [
      "6x6 drive — all wheels powered",
      "Extra ground clearance",
      "Powered dump bed",
      "2.4GHz remote",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 5-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body, steel-frame chassis" },
      { label: "Recommended age", value: "8+" },
    ],
    images: [
      "/products-dev/dump-trucks/12.jpg",
      "/products-dev/dump-trucks/13.jpg",
      "/products-dev/dump-trucks/14.jpg",
    ],
    featured: false,
    isNew: true,
    inStock: true,
  },
  {
    id: "11",
    slug: "rc-mini-dump-truck",
    name: "RC Mini Dump Truck",
    brand: "TOPRACE",
    sku: "TP-DT24",
    category: "dump-trucks",
    priceCents: 4999,
    scale: "1:24",
    shortDescription:
      "Pocket-sized dump truck for tabletop and small-space play.",
    description:
      "Small enough for a desk or a car ride, still with a working powered bed. The easy first truck for a toddler's toy box or a stocking-stuffer-sized gift.",
    features: [
      "Compact 1:24 scale",
      "Powered dump bed",
      "Simple 2-button remote",
      "Rounded, toddler-safe edges",
    ],
    specs: [
      { label: "Scale", value: "1:24" },
      { label: "Control", value: "Infrared remote, 2-channel" },
      { label: "Power", value: "3x AA batteries (not included)" },
      { label: "Material", value: "ABS" },
      { label: "Recommended age", value: "3+" },
    ],
    images: [
      "/products-dev/dump-trucks/15.jpg",
      "/products-dev/dump-trucks/16.jpg",
      "/products-dev/dump-trucks/17.jpg",
    ],
    featured: false,
    inStock: true,
  },

  // ── Bulldozers ──────────────────────────────────────────────
  {
    id: "3",
    slug: "yigong-rc-track-bulldozer",
    name: "YIGONG RC Track Bulldozer",
    brand: "YIGONG",
    sku: "YG-BD01",
    category: "bulldozers",
    priceCents: 10999,
    scale: "1:16",
    shortDescription:
      "Track-driven bulldozer with a raise/lower front blade and a seated operator figure for job-site detail.",
    description:
      "Pushes sand, snow, and dirt with a remote-controlled blade that lifts and lowers on command. Rubber-lugged tracks handle rough terrain, and the detailed cab — complete with operator figure — sells the job-site look.",
    features: [
      "Remote-controlled blade lift",
      "Rubber-lugged metal-tone tracks",
      "Detailed cab with operator figure",
      "LED headlights",
      "2.4GHz remote",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 4-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body, die-cast accents" },
      { label: "Recommended age", value: "6+" },
    ],
    images: [
      "/products-dev/bulldozers/01.jpg",
      "/products-dev/bulldozers/02.jpg",
      "/products-dev/bulldozers/03.jpg",
      "/products-dev/bulldozers/04.jpg",
    ],
    featured: true,
    inStock: true,
  },
  {
    id: "12",
    slug: "rc-mini-bulldozer",
    name: "RC Mini Bulldozer",
    brand: "TOPRACE",
    sku: "TP-BD20",
    category: "bulldozers",
    priceCents: 6499,
    scale: "1:20",
    shortDescription:
      "Small-scale bulldozer with the same push-blade action, sized for younger kids.",
    description:
      "The little sibling to the full-size dozers — same raise/lower blade action, lighter body, simpler controls. A good first tracked vehicle before graduating to the bigger rigs.",
    features: [
      "Raise/lower push blade",
      "Rubber tracks",
      "Simplified 2-channel remote",
      "Compact size for small hands",
    ],
    specs: [
      { label: "Scale", value: "1:20" },
      { label: "Control", value: "2.4GHz remote, 2-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body" },
      { label: "Recommended age", value: "4+" },
    ],
    images: [
      "/products-dev/bulldozers/05.jpg",
      "/products-dev/bulldozers/06.jpg",
      "/products-dev/bulldozers/07.jpg",
      "/products-dev/bulldozers/08.jpg",
    ],
    featured: true,
    inStock: true,
  },
  {
    id: "13",
    slug: "alloy-rc-bulldozer",
    name: "Alloy RC Bulldozer",
    brand: "DIGMASTER",
    sku: "DM-BD16A",
    category: "bulldozers",
    priceCents: 16999,
    compareAtPriceCents: 19999,
    scale: "1:16",
    shortDescription:
      "Die-cast metal blade and undercarriage for a heavier, more durable push.",
    description:
      "A metal blade and reinforced metal undercarriage add real weight behind every push — moves more sand per pass and shrugs off backyard abuse better than an all-plastic build.",
    features: [
      "Die-cast metal blade",
      "Reinforced metal undercarriage",
      "Rubber-lugged tracks",
      "2.4GHz remote",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 5-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "Die-cast metal blade, ABS cab" },
      { label: "Recommended age", value: "8+" },
    ],
    images: [
      "/products-dev/bulldozers/09.jpg",
      "/products-dev/bulldozers/10.jpg",
      "/products-dev/bulldozers/11.jpg",
    ],
    featured: false,
    inStock: true,
  },
  {
    id: "14",
    slug: "rc-snow-plow-bulldozer",
    name: "RC Snow Plow Bulldozer",
    brand: "TRAXPRO",
    sku: "TX-BD16-SNO",
    category: "bulldozers",
    priceCents: 11999,
    scale: "1:16",
    shortDescription:
      "Wide-angle blade tuned for pushing snow and loose mulch, not just sand.",
    description:
      "Same tracked chassis, a wider and shallower blade angle built for clearing snow, mulch, and leaves rather than digging into sand. A dozer for the driveway as much as the sandbox.",
    features: [
      "Wide-angle plow blade",
      "Rubber tracks rated for cold weather use",
      "Bright LED headlights for low-light play",
      "2.4GHz remote",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 4-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body, die-cast accents" },
      { label: "Recommended age", value: "6+" },
    ],
    images: [
      "/products-dev/bulldozers/12.jpg",
      "/products-dev/bulldozers/13.jpg",
      "/products-dev/bulldozers/14.jpg",
    ],
    featured: false,
    isNew: true,
    inStock: true,
  },
  {
    id: "15",
    slug: "rc-bulldozer-sound-light",
    name: "RC Bulldozer with Sound & Light",
    brand: "TOPRACE",
    sku: "TP-BD16-SL",
    category: "bulldozers",
    priceCents: 9499,
    scale: "1:16",
    shortDescription:
      "Adds engine sound effects and light-up headlights to the standard push-blade dozer.",
    description:
      "Everything the standard dozer does, plus rumbling engine sound effects and headlights that switch on with the remote — for kids who want the full sensory job-site experience.",
    features: [
      "Built-in engine sound effects",
      "Switchable LED headlights",
      "Raise/lower push blade",
      "2.4GHz remote",
    ],
    specs: [
      { label: "Scale", value: "1:16" },
      { label: "Control", value: "2.4GHz remote, 4-channel" },
      { label: "Power", value: "Rechargeable battery pack (included)" },
      { label: "Material", value: "ABS body" },
      { label: "Recommended age", value: "6+" },
    ],
    images: [
      "/products-dev/bulldozers/15.jpg",
      "/products-dev/bulldozers/16.jpg",
      "/products-dev/bulldozers/17.jpg",
      "/products-dev/bulldozers/18.jpg",
    ],
    featured: false,
    isNew: true,
    inStock: true,
  },
];

export async function getProducts(): Promise<Product[]> {
  return PRODUCTS;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return PRODUCTS.filter((p) => p.featured);
}

export async function getNewArrivals(): Promise<Product[]> {
  return PRODUCTS.filter((p) => p.isNew);
}

export async function getProductsByCategory(
  categorySlug: string,
): Promise<Product[]> {
  if (categorySlug === "all") return PRODUCTS;
  return PRODUCTS.filter((p) => p.category === categorySlug);
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  return PRODUCTS.find((p) => p.slug === slug);
}

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}
