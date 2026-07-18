import { z } from "zod";

const reviewStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);
const reviewTargetTypeEnum = z.enum(["ITEM", "DONATION"]);

export const listReviewsSchema = z.object({
  query: z.object({
    status: reviewStatusEnum.optional(),
    targetType: reviewTargetTypeEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional()
  }),
  params: z.object({}),
  body: z.object({}).optional()
});

export const getReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
  body: z.object({})
});

export const decideReviewSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  query: z.object({}),
  body: z.object({
    reasonCode: z.string().min(1).max(80).optional(),
    comment: z.string().max(1000).optional()
  })
});
