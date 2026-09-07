import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createFavoriteSchema, deleteFavoriteSchema, listFavoritesSchema } from "./schema.js";
import { addFavoriteController, listFavoritesController, removeFavoriteController } from "./controller.js";

const router = Router();
const favoriteWriteRateLimit = rateLimit({ scope: "favorite-write", windowMs: 60_000, max: 60 });

router.get("/", requireAuth, validate(listFavoritesSchema), asyncHandler(listFavoritesController));

router.post("/", requireAuth, favoriteWriteRateLimit, validate(createFavoriteSchema), asyncHandler(addFavoriteController));

router.delete("/:id", requireAuth, validate(deleteFavoriteSchema), asyncHandler(removeFavoriteController));

export default router;
