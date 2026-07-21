import { z } from "zod";
import { USER_ROLES } from "../../middleware/auth.js";

const userRoleEnum = z.enum(USER_ROLES);

export const listAdminUsersSchema = z.object({
  params: z.object({}),
  query: z.object({
    q: z.string().trim().max(120).optional(),
    role: userRoleEnum.optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional()
  }),
  body: z.object({}).optional()
});

export const updateAdminUserRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({}),
  body: z.object({
    role: userRoleEnum
  })
});
