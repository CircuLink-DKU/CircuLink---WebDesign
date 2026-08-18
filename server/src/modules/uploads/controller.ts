import { Request, Response } from "express";
import path from "path";
import { BadRequestError } from "../../utils/errors.js";
import { serverConfig, r2Enabled } from "../../config/env.js";
import { uploadBufferToR2 } from "../../lib/r2.js";

export const uploadFileController = async (req: Request, res: Response) => {
  if (!req.file) throw new BadRequestError("File is required");

  if (r2Enabled) {
    const now = new Date();
    const base = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, "0"),
      now.getDate().toString().padStart(2, "0"),
      `${Date.now()}-${base}`
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
