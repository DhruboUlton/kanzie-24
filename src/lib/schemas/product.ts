import { z } from "zod";

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
  priceTaka: z.number().min(1, "Price must be greater than 0"),
  compareAtPriceTaka: z.number().optional().nullable(),
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
  isNew: z.boolean().default(false),
  inStock: z.boolean().default(true),
  stockQty: z.number().int().min(0).default(10),
  videoUrl: z.string().optional().nullable(),
  popupVideoUrl: z.string().optional().nullable(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
