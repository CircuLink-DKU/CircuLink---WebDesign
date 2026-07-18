import { z } from "zod";

const conditionEnum = z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]);
const statusEnum = z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "SOLD", "ARCHIVED", "HIDDEN"]);

export const listItemsSchema = z.object({
  query: z.object({
    categoryId: z.string().optional(),
    q: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    condition: conditionEnum.optional(),
    status: statusEnum.optional(),
    sellerId: z.string().optional(),
    sort: z.enum(["price", "createdAt"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional()
  }),
  body: z.object({}).optional(),
  params: z.object({})
});

export const getItemSchema = z.object({
  params: z.object({ id: z.string() }),
  query: z.object({}),
  body: z.object({})
});

export const createItemSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    price: z.coerce.number().nonnegative(),
    condition: conditionEnum,
    status: statusEnum.default("ACTIVE"),
    categoryId: z.string(),
    images: z.array(z.string()).max(6).default([])
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateItemSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    price: z.coerce.number().nonnegative().optional(),
    condition: conditionEnum.optional(),
    status: statusEnum.optional(),
    categoryId: z.string().optional(),
    images: z.array(z.string()).max(6).optional()
  }),
  params: z.object({ id: z.string() }),
  query: z.object({})
});
