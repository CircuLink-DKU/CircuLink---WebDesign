import { Router } from "express";
import categoriesRouter from "../modules/categories/routes.js";
import itemsRouter from "../modules/items/routes.js";
import favoritesRouter from "../modules/favorites/routes.js";
import messagesRouter from "../modules/messages/routes.js";
import ordersRouter from "../modules/orders/routes.js";
import uploadsRouter from "../modules/uploads/routes.js";
import authRouter from "../modules/auth/routes.js";
import donationsRouter from "../modules/donations/routes.js";
import aiRouter from "../modules/ai/routes.js";
import reviewsRouter from "../modules/reviews/routes.js";
import adminRouter from "../modules/admin/routes.js";

export const router = Router();

router.use("/auth", authRouter);
router.use("/categories", categoriesRouter);
router.use("/items", itemsRouter);
router.use("/favorites", favoritesRouter);
router.use("/messages", messagesRouter);
router.use("/orders", ordersRouter);
router.use("/uploads", uploadsRouter);
router.use("/donations", donationsRouter);
router.use("/ai", aiRouter);
router.use("/reviews", reviewsRouter);
router.use("/admin", adminRouter);
