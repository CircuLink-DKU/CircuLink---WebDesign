import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { requireAdminOrClubOperator, requireAuth } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import {
  createDonationController,
  getDonationController,
  listDonationsController
} from "./controller.js";
import { createDonationSchema, getDonationSchema, listDonationsSchema } from "./schema.js";

const router = Router();

router.post("/", requireAuth, validate(createDonationSchema), asyncHandler(createDonationController));
router.get("/", requireAuth, requireAdminOrClubOperator, validate(listDonationsSchema), asyncHandler(listDonationsController));
router.get("/:id", requireAuth, requireAdminOrClubOperator, validate(getDonationSchema), asyncHandler(getDonationController));

export default router;
