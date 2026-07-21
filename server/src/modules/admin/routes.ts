import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { listAdminUsersController, updateAdminUserRoleController } from "./controller.js";
import { listAdminUsersSchema, updateAdminUserRoleSchema } from "./schema.js";

const router = Router();

router.get("/users", requireAuth, requireAdmin, validate(listAdminUsersSchema), asyncHandler(listAdminUsersController));
router.patch(
  "/users/:id/role",
  requireAuth,
  requireAdmin,
  validate(updateAdminUserRoleSchema),
  asyncHandler(updateAdminUserRoleController)
);

export default router;
