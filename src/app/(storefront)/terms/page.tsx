import type { Metadata } from "next";

const INTRO =
  "Welcome to KANZIE. By accessing or using our website, placing an order, or purchasing our products, you agree to the following Terms & Conditions. Please read them carefully before using our website.";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: INTRO,
  alternates: { canonical: "/terms" },
};

// The legal text lives here as data so every quote mark, apostrophe and
// ampersand goes through untouched, and so a clause can be edited without
// touching markup. A string is a paragraph; an array of strings is a bullet
// list. "\n" inside a paragraph is a line break.
type Block = string | string[];
type Clause = { title: string; blocks: Block[] };

const CLAUSES: Clause[] = [
  {
    title: "1. About KANZIE",
    blocks: [
      "KANZIE is a Bangladesh-based online store offering RC vehicles, diecast models, collectibles, action figures, hobby products, and related accessories.",
      "Throughout these Terms & Conditions, “KANZIE,” “we,” “our,” or “us” refers to KANZIE, and “you” or “customer” refers to anyone accessing our website or purchasing our products.",
    ],
  },
  {
    title: "2. Using Our Website",
    blocks: [
      "You agree to use this website only for lawful purposes.",
      "You must not:",
      [
        "Use the website for fraudulent or unlawful activities.",
        "Attempt to gain unauthorized access to our website or systems.",
        "Copy, reproduce, or distribute our website content without permission.",
        "Interfere with the operation or security of the website.",
        "Provide false or misleading information when placing an order.",
      ],
      "We reserve the right to restrict or terminate access to the website if we reasonably believe these Terms have been violated.",
    ],
  },
  {
    title: "3. Product Information",
    blocks: [
      "We make reasonable efforts to ensure that product descriptions, specifications, images, prices, and other information displayed on our website are accurate.",
      "However:",
      [
        "Product colors may appear slightly different depending on your device or screen.",
        "Minor variations may exist between product images and the actual product.",
        "Product specifications may change due to manufacturer updates.",
        "Dimensions and measurements may have a small margin of variation.",
        "Some products may contain small parts and may not be suitable for young children.",
      ],
      "We recommend reading the complete product description before placing an order.",
    ],
  },
  {
    title: "4. Product Availability",
    blocks: [
      "All products are subject to availability.",
      "A product displayed on our website may become unavailable before your order is processed. If this happens, we will contact you and may offer an alternative, refund, or other appropriate solution.",
      "We reserve the right to limit quantities or discontinue products without prior notice.",
    ],
  },
  {
    title: "5. Prices",
    blocks: [
      "All prices displayed on KANZIE are in Bangladeshi Taka (BDT) unless otherwise stated.",
      "We reserve the right to change product prices, promotional offers, discounts, and availability at any time.",
      "A price change will not affect an order that has already been confirmed by KANZIE, except where an obvious pricing or technical error has occurred.",
    ],
  },
  {
    title: "6. Placing an Order",
    blocks: [
      "When you place an order through our website, you are making a request to purchase the selected product(s).",
      "After receiving your order, we may contact you to verify your:",
      [
        "Name",
        "Phone number",
        "Delivery address",
        "Order details",
        "Payment information, where applicable",
      ],
      "An order may be cancelled if we are unable to verify the information provided, if the product becomes unavailable, or if we identify suspicious or fraudulent activity.",
    ],
  },
  {
    title: "7. Order Confirmation",
    blocks: [
      "Receiving an order confirmation does not necessarily guarantee that the order will be fulfilled.",
      "An order is considered confirmed when KANZIE has verified the order and accepted it for processing.",
      "We reserve the right to cancel an order in cases including, but not limited to:",
      [
        "Product unavailability",
        "Incorrect pricing caused by a technical error",
        "Incorrect or incomplete customer information",
        "Suspected fraudulent activity",
        "Repeated failed delivery attempts",
        "Other circumstances beyond our reasonable control",
      ],
      "If payment has already been made for an order that we cancel, the applicable amount will be refunded according to our refund policy.",
    ],
  },
  {
    title: "8. Cash on Delivery",
    blocks: [
      "For Cash on Delivery (COD) orders, customers are expected to receive the package and pay the applicable amount to the delivery partner upon delivery.",
      "Customers should not place orders with false information or without genuine intention to receive the package.",
      "Repeated refusal or failure to receive confirmed COD orders may result in restrictions on future COD purchases.",
    ],
  },
  {
    title: "9. Delivery",
    blocks: [
      "We deliver products to locations supported by our delivery partners within Bangladesh.",
      "Delivery times may vary depending on:",
      [
        "Delivery location",
        "Courier availability",
        "Weather conditions",
        "Public holidays",
        "Unexpected logistical issues",
        "Other circumstances beyond our control",
      ],
      "Estimated delivery times are not guaranteed delivery dates.",
      "Once an order has been handed over to the delivery partner, delays caused by the courier may be outside KANZIE's direct control. However, we will make reasonable efforts to assist customers in resolving delivery-related issues.",
    ],
  },
  {
    title: "10. Inspecting Your Package",
    blocks: [
      "Customers are encouraged to inspect the package condition at the time of delivery whenever possible.",
      "If the package appears significantly damaged, please contact KANZIE as soon as possible and provide photographs or video evidence of the package and product.",
      "This will help us investigate the issue with the relevant delivery partner.",
    ],
  },
  {
    title: "11. Returns, Replacements & Refunds",
    blocks: [
      "Returns, replacements, and refunds are handled according to our Return & Refund Policy.",
      "Products may only qualify for a return, replacement, or refund when the applicable conditions stated in our Return & Refund Policy are satisfied.",
      "Certain products may not be eligible for return due to their nature, condition, or other applicable restrictions.",
      "Please review our Return & Refund Policy before placing an order.",
    ],
  },
  {
    title: "12. Damaged or Defective Products",
    blocks: [
      "If you receive a product that appears damaged, defective, or materially different from the product ordered, please contact us within the timeframe specified in our Return & Refund Policy.",
      "We may request:",
      [
        "Order number",
        "Photos of the product",
        "Photos/videos of the packaging",
        "A description of the issue",
        "Other information reasonably required to investigate the claim",
      ],
      "Depending on the circumstances, we may provide a replacement, repair, refund, or another appropriate solution.",
    ],
  },
  {
    title: "13. RC Products & Electronic Components",
    blocks: [
      "For RC vehicles and electronic products, customers should follow the manufacturer's instructions for charging, operation, storage, and maintenance.",
      "Damage resulting from misuse, accidents, unauthorized modification, incorrect charging, water exposure, physical impact, or improper handling may not be covered under our return or replacement policy.",
      "Where applicable, batteries, chargers, controllers, motors, and other electronic components may have specific usage requirements.",
    ],
  },
  {
    title: "14. Intellectual Property",
    blocks: [
      "All content appearing on the KANZIE website, including but not limited to:",
      [
        "KANZIE logos",
        "Brand name",
        "Product descriptions",
        "Graphics",
        "Website design",
        "Images",
        "Text",
        "Videos",
        "Other original materials",
      ],
      "is owned by or licensed to KANZIE unless otherwise stated.",
      "You may not reproduce, modify, distribute, publish, or commercially use our content without prior written permission.",
    ],
  },
  {
    title: "15. Third-Party Links & Services",
    blocks: [
      "Our website may contain links or integrations provided by third-party services, such as payment providers, delivery partners, social media platforms, or other external services.",
      "KANZIE is not responsible for the content, policies, availability, or practices of third-party websites or services.",
      "Your use of third-party services may be subject to their own terms and policies.",
    ],
  },
  {
    title: "16. Privacy",
    blocks: [
      "Your personal information is handled according to our Privacy Policy.",
      "By using our website and placing an order, you agree that KANZIE may collect and use information reasonably necessary to process orders, provide customer support, arrange delivery, process payments, and improve our services, subject to applicable laws and our Privacy Policy.",
    ],
  },
  {
    title: "17. Promotions & Discounts",
    blocks: [
      "Promotional offers, discount codes, campaigns, and special pricing may be subject to specific conditions.",
      "Unless otherwise stated:",
      [
        "Promotions cannot be combined with other offers.",
        "Promotional prices are available only during the stated promotional period.",
        "KANZIE reserves the right to modify or terminate a promotion where necessary.",
        "Discount codes may have usage limits or eligibility requirements.",
      ],
    ],
  },
  {
    title: "18. Limitation of Liability",
    blocks: [
      "KANZIE will make reasonable efforts to provide accurate information and reliable services.",
      "However, we are not responsible for losses or delays resulting from circumstances beyond our reasonable control, including courier delays, natural disasters, technical failures, supplier issues, or other unforeseen events.",
      "Our responsibility relating to a purchased product will be limited to the remedies available under our applicable policies and applicable law.",
    ],
  },
  {
    title: "19. Changes to These Terms",
    blocks: [
      "KANZIE may update these Terms & Conditions from time to time to reflect changes in our services, policies, business practices, or applicable requirements.",
      "The updated version will be published on this page with a revised “Last Updated” date.",
      "Your continued use of the website after changes are published constitutes acceptance of the updated Terms & Conditions.",
    ],
  },
  {
    title: "20. Governing Law",
    blocks: [
      "These Terms & Conditions shall be governed by and interpreted in accordance with the applicable laws of Bangladesh.",
      "Any dispute arising in connection with these Terms shall be subject to the applicable jurisdiction of Bangladesh.",
    ],
  },
  {
    title: "21. Contact Us",
    blocks: [
      "If you have any questions regarding these Terms & Conditions, orders, products, or our policies, please contact KANZIE through the contact information provided on our website.",
      "KANZIE\nBangladesh",
    ],
  },
];

const ACKNOWLEDGEMENT =
  "By using KANZIE.shop or placing an order, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <header>
        <h1 className="font-display text-4xl sm:text-5xl tracking-wide">
          TERMS &amp; CONDITIONS
        </h1>
        <p className="mt-3 text-sm text-black/60">Last Updated: October 2026</p>
        <p className="mt-6 leading-relaxed text-black/70">{INTRO}</p>
      </header>

      {CLAUSES.map((clause) => (
        <section key={clause.title} className="mt-10">
          <h2 className="font-display text-xl sm:text-2xl tracking-wide">
            {clause.title}
          </h2>
          <div className="mt-3 space-y-3 leading-relaxed text-black/70">
            {clause.blocks.map((block, i) =>
              Array.isArray(block) ? (
                <ul key={i} className="list-disc space-y-1.5 pl-6">
                  {block.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} className="whitespace-pre-line">
                  {block}
                </p>
              ),
            )}
          </div>
        </section>
      ))}

      <p className="mt-12 rounded-lg border-l-4 border-accent bg-white p-5 font-semibold text-ink shadow-sm">
        {ACKNOWLEDGEMENT}
      </p>
    </div>
  );
}
