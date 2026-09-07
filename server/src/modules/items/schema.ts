import { z } from "zod";

const conditionEnum = z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]);
const statusEnum = z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "SOLD", "ARCHIVED", "HIDDEN"]);
// On create, a client may only choose between draft and (pending) active — it
// must not be able to self-assign SOLD/HIDDEN/etc.
const createStatusEnum = z.enum(["DRAFT", "ACTIVE"]);

// Bounds to stop oversized text/price from bloating rows or breaking the UI.
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
const PRICE_MAX = 1_000_000;

export const listItemsSchema = z.object({
  query: z.object({
    categoryId: z.string().optional(),
    q: z.string().max(200).optional(),
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
    title: z.string().min(1).max(TITLE_MAX),
    description: z.string().min(1).max(DESCRIPTION_MAX),
    price: z.coerce.number().nonnegative().max(PRICE_MAX),
    condition: conditionEnum,
    status: createStatusEnum.default("ACTIVE"),
    categoryId: z.string(),
    images: z.array(z.string()).max(6).default([])
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateItemSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(TITLE_MAX).optional(),
    description: z.string().min(1).max(DESCRIPTION_MAX).optional(),
    price: z.coerce.number().nonnegative().max(PRICE_MAX).optional(),
    condition: conditionEnum.optional(),
    status: statusEnum.optional(),
    categoryId: z.string().optional(),
    images: z.array(z.string()).max(6).optional()
  }),
  params: z.object({ id: z.string() }),
  query: z.object({})
});
