import { z } from 'zod';

const translationsSchema = z
  .record(
    z.string().min(2).max(8), // locale code, e.g. 'hi', 'en-IN'
    z.object({
      name: z.string().max(128).optional(),
      description: z.string().max(2000).optional(),
    }),
  )
  .optional()
  .nullable();

export const menuCategoryInput = z.object({
  name: z.string().min(1).max(64),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  displayOrder: z.number().int().min(0).default(0),
  imageUrl: z.string().url().max(512).optional().nullable(),
  translations: translationsSchema,
  isActive: z.boolean().default(true),
});
export type MenuCategoryInput = z.infer<typeof menuCategoryInput>;

export const menuCategoryUpdate = menuCategoryInput.partial();
export type MenuCategoryUpdate = z.infer<typeof menuCategoryUpdate>;

export const menuItemInput = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().max(2000).optional().nullable(),
  basePrice: z.number().int().min(0),
  taxRate: z.number().min(0).max(100).optional().nullable(),
  isVeg: z.boolean().default(true),
  spicyLevel: z.number().int().min(0).max(3).default(0),
  prepTimeMinutes: z.number().int().min(0).max(180).optional().nullable(),
  stationId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(32)).max(10).default([]),
  imageUrl: z.string().url().max(512).optional().nullable(),
  imageBase64: z.string().optional().nullable(),
  translations: translationsSchema,
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().min(0).default(0),
});
export type MenuItemInput = z.infer<typeof menuItemInput>;

export const menuItemUpdate = menuItemInput.partial();
export type MenuItemUpdate = z.infer<typeof menuItemUpdate>;

export const availabilityToggle = z.object({
  isAvailable: z.boolean(),
});
export type AvailabilityToggle = z.infer<typeof availabilityToggle>;
