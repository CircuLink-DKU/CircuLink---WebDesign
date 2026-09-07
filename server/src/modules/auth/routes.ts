import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  requestVerifySchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema
} from "./schema.js";
import {
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  refreshController,
  registerController,
  requestVerifyController,
  resetPasswordController,
  updateProfileController,
  verifyEmailController
} from "./controller.js";

const router = Router();

// These buckets are keyed by IP for unauthenticated calls. A campus behind a
// single NAT egress shares one bucket, so the limits must accommodate the whole
// community rather than one person.
// NOTE: per-IP limiting is a blunt instrument against credential stuffing —
// per-account login throttling is the proper follow-up.
const authWriteRateLimit = rateLimit({ scope: "auth-write", windowMs: 60_000, max: 120 });

// Token refresh is high-frequency and legitimate: every signed-in client renews
// roughly every access-token lifetime (15m), so N active users generate ~N/15
// refreshes per minute from the same NAT address.
const refreshRateLimit = rateLimit({ scope: "auth-refresh", windowMs: 60_000, max: 300 });

router.post("/register", authWriteRateLimit, validate(registerSchema), asyncHandler(registerController));

router.post("/login", authWriteRateLimit, validate(loginSchema), asyncHandler(loginController));

router.post("/refresh", refreshRateLimit, validate(refreshSchema), asyncHandler(refreshController));

router.post("/logout", authWriteRateLimit, validate(logoutSchema), asyncHandler(logoutController));

router.get("/me", requireAuth, asyncHandler(meController));

router.patch("/profile", requireAuth, validate(updateProfileSchema), asyncHandler(updateProfileController));

router.post("/verify/request", authWriteRateLimit, validate(requestVerifySchema), asyncHandler(requestVerifyController));

router.post("/verify", authWriteRateLimit, validate(verifyEmailSchema), asyncHandler(verifyEmailController));

router.post("/password/forgot", authWriteRateLimit, validate(forgotPasswordSchema), asyncHandler(forgotPasswordController));

router.post("/password/reset", authWriteRateLimit, validate(resetPasswordSchema), asyncHandler(resetPasswordController));

export default router;
