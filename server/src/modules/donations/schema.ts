import { z } from "zod";

export const createDonationSchema = z.object({
  body: z.object({
    description: z.string().min(1),
    categoryId: z.string().min(1),
    images: z.array(z.string()).max(6).min(1)
  }),
  query: z.object({}),
  params: z.object({})
});

export const listDonationsSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    categoryId: z.string().optional(),
    sellerId: z.string().optional(),
    donorId: z.string().optional(),
    status: z.enum(["PENDING_REVIEW", "ACTIVE", "REJECTED", "RESERVED", "CLAIMED", "ARCHIVED", "HIDDEN"]).optional(),
    reviewStatus: z.enum(["APPROVED", "PENDING_REVIEW", "REJECTED"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional()
  }),
  body: z.object({}).optional(),
  params: z.object({})
});

export const getDonationSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
  body: z.object({})
});
