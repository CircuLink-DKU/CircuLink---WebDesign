import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { createItemSchema, getItemSchema, listItemsSchema, updateItemSchema } from "./schema.js";
import {
  createItemController,
  deleteItemController,
  getItemController,
  listItemsController,
  updateItemController
} from "./controller.js";

const router = Router();
const itemWriteRateLimit = rateLimit({ scope: "item-write", windowMs: 60_000, max: 30 });

router.get("/", validate(listItemsSchema), asyncHandler(listItemsController));

router.get("/:id", validate(getItemSchema), asyncHandler(getItemController));

router.post("/", requireAuth, itemWriteRateLimit, validate(createItemSchema), asyncHandler(createItemController));

router.patch("/:id", requireAuth, validate(updateItemSchema), asyncHandler(updateItemController));

router.delete("/:id", requireAuth, validate(getItemSchema), asyncHandler(deleteItemController));

export default router;
