import { z } from "zod";

const reviewStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED", "NEEDS_CHANGES", "HIDDEN"]);
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
    reasonCode: z.enum([
      "missing_images",
      "external_payment",
      "high_value",
      "sensitive_category",
      "unsafe_or_prohibited",
      "inaccurate_description",
      "duplicate_submission",
      "policy_violation",
      "other"
    ]).optional(),
    comment: z.string().max(1000).optional()
  })
});
