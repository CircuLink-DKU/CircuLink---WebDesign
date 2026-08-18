import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { serverConfig, r2Enabled } from "../../config/env.js";
import { BadRequestError } from "../../utils/errors.js";
import { uploadFileController } from "./controller.js";

const router = Router();

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const dir = path.join(
      path.resolve(serverConfig.uploadDir),
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, "0"),
      now.getDate().toString().padStart(2, "0")
    );
    fs.mkdir(dir, { recursive: true })
      .then(() => cb(null, dir))
      .catch((error) => cb(error as Error, dir));
  },
  filename: (_req, file, cb) => {
    const base = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const name = `${Date.now()}-${base}`;
    cb(null, name);
  }
});

const storage = r2Enabled ? multer.memoryStorage() : diskStorage;

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype)) return cb(null, true);
    return cb(new BadRequestError("Unsupported file type"));
  }
});

router.post("/", requireAuth, upload.single("file"), asyncHandler(uploadFileController));

export default router;
