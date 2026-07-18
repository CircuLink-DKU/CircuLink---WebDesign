import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAdminOrClubOperator, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  approveReviewController,
  getReviewController,
  listReviewsController,
  rejectReviewController
} from "./controller.js";
import { decideReviewSchema, getReviewSchema, listReviewsSchema } from "./schema.js";

const router = Router();

router.get("/", requireAuth, requireAdminOrClubOperator, validate(listReviewsSchema), asyncHandler(listReviewsController));
router.get("/:id", requireAuth, requireAdminOrClubOperator, validate(getReviewSchema), asyncHandler(getReviewController));
router.post(
  "/:id/approve",
  requireAuth,
  requireAdminOrClubOperator,
  validate(decideReviewSchema),
  asyncHandler(approveReviewController)
);
router.post(
  "/:id/reject",
  requireAuth,
  requireAdminOrClubOperator,
  validate(decideReviewSchema),
  asyncHandler(rejectReviewController)
);

export default router;
