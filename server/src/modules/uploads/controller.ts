import { Request, Response } from "express";
import path from "path";
import crypto from "crypto";
import { BadRequestError } from "../../utils/errors.js";
import { serverConfig, r2Enabled } from "../../config/env.js";
import { uploadBufferToR2 } from "../../lib/r2.js";
import { safeImageExt } from "./mime.js";

export const uploadFileController = async (req: Request, res: Response) => {
  if (!req.file) throw new BadRequestError("File is required");

  if (r2Enabled) {
    const now = new Date();
    // Random object key with an extension derived from the validated mimetype;
    // the client filename is never used (prevents unsafe extensions like .html).
    const ext = safeImageExt(req.file.mimetype);
    const key = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, "0"),
      now.getDate().toString().padStart(2, "0"),
      `${Date.now()}-${crypto.randomUUID()}.${ext}`
    ].join("/");
    const url = await uploadBufferToR2(key, req.file.buffer, req.file.mimetype);
    res.status(201).json({ data: { path: url } });
    return;
  }

  const uploadRoot = path.resolve(serverConfig.uploadDir);
  const relativePath = path.join(
    "/uploads",
    path.relative(uploadRoot, path.resolve(req.file.path)).split(path.sep).join("/")
  );
  res.status(201).json({ data: { path: relativePath } });
};
