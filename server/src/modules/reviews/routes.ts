import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAdmin, requireAdminOrClubOperator, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  approveReviewController,
  getReviewController,
  hideReviewController,
  listReviewsController,
  requestChangesReviewController,
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
router.post(
  "/:id/request-changes",
  requireAuth,
  requireAdminOrClubOperator,
  validate(decideReviewSchema),
  asyncHandler(requestChangesReviewController)
);
router.post(
  "/:id/hide",
  requireAuth,
  requireAdmin,
  validate(decideReviewSchema),
  asyncHandler(hideReviewController)
);

export default router;
