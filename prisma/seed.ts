import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create Default Admin User
  // No admin account is seeded. Creating one here would mean shipping a
  // known password; the first owner is created through the setup screen at
  // /admin/login, which only appears while no admin exists.
  const adminCount = await prisma.adminUser.count();
  if (adminCount === 0) {
    console.log(
      "No admin user yet — open /admin/login to create the owner account.",
    );
  }
  // 2. Create Categories
  const categoriesData = [
    { slug: "excavators", name: "Excavators", sortOrder: 1 },
    { slug: "dump-trucks", name: "Dump Trucks", sortOrder: 2 },
    { slug: "bulldozers", name: "Bulldozers", sortOrder: 3 },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryMap[cat.slug] = record.id;
  }

  // 3. Create Products
  const productsData = [
    // Excavators
    {
      slug: "yg258c-rc-excavator",
      name: "YG258C RC Hydraulic Excavator",
      brand: "YIGONG",
      sku: "YG258C",
      categorySlug: "excavators",
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
      isNew: false,
      inStock: true,
      stockQty: 25,
      videoUrl: null,
    },
    {
      slug: "compact-rc-mini-excavator",
      name: "Compact RC Mini Excavator",
      brand: "TOPRACE",
      sku: "TP-EX20",
      categorySlug: "excavators",
      priceCents: 6999,
      compareAtPriceCents: null,
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
      videoUrl: "https://drive.google.com/file/d/1hzyuXhGJyUQpkeCuYbZNBg50GLlDVqyn/view?usp=drive_link",
      featured: true,
      isNew: true,
      inStock: true,
      stockQty: 18,
    },
    {
      slug: "alloy-rc-crawler-excavator",
      name: "Alloy RC Crawler Excavator",
      brand: "DIGMASTER",
      sku: "DM-EX14A",
      categorySlug: "excavators",
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
      isNew: false,
      inStock: true,
      stockQty: 12,
      videoUrl: null,
    },
    {
      slug: "rc-excavator-starter-pack",
      name: "RC Excavator Starter Pack",
      brand: "TOPRACE",
      sku: "TP-EX18",
      categorySlug: "excavators",
      priceCents: 5499,
      compareAtPriceCents: null,
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
      isNew: false,
      inStock: true,
      stockQty: 30,
      videoUrl: null,
    },
    {
      slug: "rc-excavator-loader-combo",
      name: "RC Excavator & Loader Combo",
      brand: "DIGMASTER",
      sku: "DM-EX16C",
      categorySlug: "excavators",
      priceCents: 15999,
      compareAtPriceCents: null,
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
      isNew: false,
      inStock: true,
      stockQty: 15,
      videoUrl: null,
    },

    // Dump Trucks
    {
      slug: "yg258e-rc-dump-truck",
      name: "YG258-E RC Mining Dump Truck",
      brand: "YIGONG",
      sku: "YG258-E",
      categorySlug: "dump-trucks",
      priceCents: 8999,
      compareAtPriceCents: null,
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
      isNew: false,
      inStock: true,
      stockQty: 22,
      videoUrl: null,
    },
    {
      slug: "rc-articulated-dump-truck",
      name: "RC Articulated Dump Truck",
      brand: "TRAXPRO",
      sku: "TX-DT20",
      categorySlug: "dump-trucks",
      priceCents: 9999,
      compareAtPriceCents: null,
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
      isNew: false,
      inStock: true,
      stockQty: 14,
      videoUrl: null,
    },
    {
      slug: "rc-tipper-dump-truck",
      name: "RC Tipper Dump Truck",
      brand: "YIGONG",
      sku: "YG-DT16T",
      categorySlug: "dump-trucks",
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
      isNew: false,
      inStock: true,
      stockQty: 19,
      videoUrl: null,
    },
    {
      slug: "rc-off-road-dump-truck-6x6",
      name: "RC Off-Road Dump Truck 6x6",
      brand: "TRAXPRO",
      sku: "TX-DT16-6X6",
      categorySlug: "dump-trucks",
      priceCents: 13999,
      compareAtPriceCents: null,
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
      stockQty: 8,
      videoUrl: null,
    },
    {
      slug: "rc-mini-dump-truck",
      name: "RC Mini Dump Truck",
      brand: "TOPRACE",
      sku: "TP-DT24",
      categorySlug: "dump-trucks",
      priceCents: 4999,
      compareAtPriceCents: null,
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
      isNew: false,
      inStock: true,
      stockQty: 25,
      videoUrl: null,
    },

    // Bulldozers
    {
      slug: "yigong-rc-track-bulldozer",
      name: "YIGONG RC Track Bulldozer",
      brand: "YIGONG",
      sku: "YG-BD01",
      categorySlug: "bulldozers",
      priceCents: 10999,
      compareAtPriceCents: null,
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
      isNew: false,
      inStock: true,
      stockQty: 16,
      videoUrl: null,
    },
    {
      slug: "rc-mini-bulldozer",
      name: "RC Mini Bulldozer",
      brand: "TOPRACE",
      sku: "TP-BD20",
      categorySlug: "bulldozers",
      priceCents: 6499,
      compareAtPriceCents: null,
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
      isNew: false,
      inStock: true,
      stockQty: 20,
      videoUrl: null,
    },
    {
      slug: "alloy-rc-bulldozer",
      name: "Alloy RC Bulldozer",
      brand: "DIGMASTER",
      sku: "DM-BD16A",
      categorySlug: "bulldozers",
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
      isNew: false,
      inStock: true,
      stockQty: 10,
      videoUrl: null,
    },
    {
      slug: "rc-snow-plow-bulldozer",
      name: "RC Snow Plow Bulldozer",
      brand: "TRAXPRO",
      sku: "TX-BD16-SNO",
      categorySlug: "bulldozers",
      priceCents: 11999,
      compareAtPriceCents: null,
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
      stockQty: 14,
      videoUrl: null,
    },
    {
      slug: "rc-bulldozer-sound-light",
      name: "RC Bulldozer with Sound & Light",
      brand: "TOPRACE",
      sku: "TP-BD16-SL",
      categorySlug: "bulldozers",
      priceCents: 9499,
      compareAtPriceCents: null,
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
      stockQty: 18,
      videoUrl: null,
    },
  ];

  for (const prod of productsData) {
    const categoryId = categoryMap[prod.categorySlug];
    if (!categoryId) continue;

    await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        name: prod.name,
        brand: prod.brand,
        sku: prod.sku,
        categoryId,
        priceCents: prod.priceCents,
        compareAtPriceCents: prod.compareAtPriceCents,
        scale: prod.scale,
        shortDescription: prod.shortDescription,
        description: prod.description,
        features: prod.features,
        specs: prod.specs,
        images: prod.images,
        featured: prod.featured,
        isNew: prod.isNew,
        inStock: prod.inStock,
        stockQty: prod.stockQty,
        videoUrl: prod.videoUrl,
      },
      create: {
        slug: prod.slug,
        name: prod.name,
        brand: prod.brand,
        sku: prod.sku,
        categoryId,
        priceCents: prod.priceCents,
        compareAtPriceCents: prod.compareAtPriceCents,
        scale: prod.scale,
        shortDescription: prod.shortDescription,
        description: prod.description,
        features: prod.features,
        specs: prod.specs,
        images: prod.images,
        featured: prod.featured,
        isNew: prod.isNew,
        inStock: prod.inStock,
        stockQty: prod.stockQty,
        videoUrl: prod.videoUrl,
      },
    });
  }

  // 4. Default Settings
  const settings = [
    { key: "announcement_text", value: "Free shipping across Bangladesh on orders over ৳5,000" },
    { key: "announcement_enabled", value: "true" },
    { key: "contact_phone", value: "+880 1700-000000" },
    { key: "contact_email", value: "support@kanzie.com" },
  ];

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("Seeding complete! 15 products, 3 categories, admin, and settings seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
