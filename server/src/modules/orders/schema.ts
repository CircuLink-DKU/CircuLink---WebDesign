import { z } from "zod";

const statusEnum = z.enum(["PENDING", "ACCEPTED", "REJECTED", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"]);

export const createOrderSchema = z.object({
  // `total` is intentionally NOT accepted from the client: the order amount is
  // always derived server-side from the item's price to prevent price tampering.
  body: z.object({
    itemId: z.string()
  }),
  params: z.object({}),
  query: z.object({})
});

export const listOrdersSchema = z.object({
  query: z.object({
    role: z.enum(["buyer", "seller"]).optional(),
    status: statusEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional()
  }),
  params: z.object({}),
  body: z.object({})
});

export const getOrderByIdSchema = z.object({
  params: z.object({ id: z.string() }),
  query: z.object({}),
  body: z.object({})
});

export const updateOrderStatusSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({ status: statusEnum }),
  query: z.object({})
});
