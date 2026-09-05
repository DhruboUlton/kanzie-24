import { z } from "zod";
import { MAX_SALE_PERCENT, MIN_SALE_PERCENT } from "@/lib/product-pricing";

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  brand: z.string().min(1, "Brand is required").max(100),
  sku: z.string().min(1, "SKU is required").max(100),
  categoryId: z.string().min(1, "Category is required"),
  priceTaka: z
    .number({ message: "Price must be a number" })
    .finite("Price must be a number")
    .min(1, "Price must be greater than 0"),
  // Null means no sale. A percentage outside 1-100 is rejected here as well
  // as in the form, so a hand-made request cannot create a 150% discount.
  salePercent: z
    .number({ message: "Sale percentage must be a number" })
    .int("Sale percentage must be a whole number")
    .min(MIN_SALE_PERCENT, `Sale percentage must be at least ${MIN_SALE_PERCENT}%`)
    .max(MAX_SALE_PERCENT, `Sale percentage cannot exceed ${MAX_SALE_PERCENT}%`)
    .nullable()
    .optional(),
  compareAtPriceTaka: z
    .number({ message: "Compare-at price must be a number" })
    .finite("Compare-at price must be a number")
    .min(0, "Compare-at price cannot be negative")
    .optional()
    .nullable(),
  scale: z.string().min(1, "Scale is required (e.g. 1:16)"),
  shortDescription: z.string().min(5, "Short description is required"),
  description: z.string().min(10, "Full description is required"),
  features: z.array(z.string().min(1)).min(1, "At least one feature is required"),
  specs: z.array(
    z.object({
      label: z.string().min(1, "Spec label is required"),
      value: z.string().min(1, "Spec value is required"),
    })
  ),
  images: z.array(z.string().min(1)).min(1, "At least one image is required"),
  featured: z.boolean().default(false),
  featuredOrder: z.number().int().min(0).default(0),
  isNew: z.boolean().default(false),
  categoryOrder: z.number().int().min(0).default(0),
  inStock: z.boolean().default(true),
  // The admin's manual hold. Distinct from inStock, which the stock pipeline
  // owns and overwrites on every movement.
  soldOut: z.boolean().default(false),
  stockQty: z.number().int().min(0, "Stock cannot be negative").default(10),
  videoUrl: z.string().optional().nullable(),
  popupVideoUrl: z.string().optional().nullable(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
