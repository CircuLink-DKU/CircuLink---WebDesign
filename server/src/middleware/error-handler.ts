import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/errors.js";
import { logger } from "../lib/logger.js";
import { BusinessCode } from "../types/business-code.enum.js";

/**
 * 根据 HTTP 状态码映射业务状态码。
 *
 * HTTP status 用于浏览器 / fetch / 网关判断请求是否成功；
 * BusinessCode 用于前端进一步判断具体业务错误。
 */
const getBusinessCode = (status: number): BusinessCode => {
  switch (status) {
    case 400:
      return BusinessCode.PARAM_ERROR;
    case 401:
      return BusinessCode.AUTH_ERROR;
    case 403:
      return BusinessCode.PERMISSION_DENIED;
    case 404:
      return BusinessCode.DATA_NOT_FOUND;
    case 409:
      return BusinessCode.DATA_EXISTS;
    default:
      return status >= 500
        ? BusinessCode.SYSTEM_ERROR
        : BusinessCode.FAIL;
  }
};

/**
 * 统一错误响应。
 *
 * 顶层 code/message/data 是新的统一协议。
 *
 * error 字段暂时保留，用于兼容目前 src/lib/api.ts
 * 对 error.message / error.code 的读取方式。
 */
const errorResponse = (
  res: Response,
  httpStatus: number,
  code: BusinessCode,
  message: string,
  path: string,
  legacyCode: string
): Response => {
  return res.status(httpStatus).json({
    code,
    message,
    data: null,
    timestamp: Date.now(),
    path,

    // 向后兼容当前前端 ApiClient
    error: {
      code: legacyCode,
      message,
    },
  });
};

/**
 * Express 全局错误处理中间件。
 *
 * 必须放在所有 route 之后。
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 如果响应已经开始发送，让 Express 继续处理，
  // 避免重复写 response header。
  if (res.headersSent) {
    return next(err);
  }

  const path = req.originalUrl || req.path;

  /**
   * 1. Multer 文件上传错误
   */
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return errorResponse(
        res,
        413,
        BusinessCode.PARAM_ERROR,
        "文件过大，最大允许 10MB",
        path,
        "PAYLOAD_TOO_LARGE"
      );
    }

    return errorResponse(
      res,
      400,
      BusinessCode.PARAM_ERROR,
      `上传错误: ${err.message}`,
      path,
      "UPLOAD_ERROR"
    );
  }

  /**
   * 2. Express 请求体过大
   */
  if (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    (err as { type?: string }).type === "entity.too.large"
  ) {
    return errorResponse(
      res,
      413,
      BusinessCode.PARAM_ERROR,
      "请求体过大，请使用文件上传接口",
      path,
      "PAYLOAD_TOO_LARGE"
    );
  }

  /**
   * 3. Zod 参数验证错误
   */
  if (err instanceof ZodError) {
    return errorResponse(
      res,
      400,
      BusinessCode.PARAM_ERROR,
      `参数验证失败: ${err.message}`,
      path,
      "BAD_REQUEST"
    );
  }

  /**
   * 4. 项目已有的 HttpError
   *
   * AuthError / ForbiddenError / NotFoundError /
   * BadRequestError / ConflictError 都会进入这里。
   */
  if (err instanceof HttpError) {
    return errorResponse(
      res,
      err.status,
      getBusinessCode(err.status),
      err.message || "请求失败",
      path,
      err.code
    );
  }

  /**
   * 5. Prisma 数据库错误
   */
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err
  ) {
    const prismaError = err as {
      code?: unknown;
      message?: unknown;
    };

    if (typeof prismaError.code === "string") {
      // 唯一约束冲突
      if (prismaError.code === "P2002") {
        return errorResponse(
          res,
          409,
          BusinessCode.DATA_EXISTS,
          "数据已存在，请勿重复添加",
          path,
          "CONFLICT"
        );
      }

      // 更新/删除目标不存在
      if (prismaError.code === "P2025") {
        return errorResponse(
          res,
          404,
          BusinessCode.DATA_NOT_FOUND,
          "操作的数据不存在",
          path,
          "NOT_FOUND"
        );
      }
    }
  }

  /**
   * 6. 未分类错误
   */
  logger.error(
    {
      err,
      requestId: req.requestId,
      path,
    },
    "Unhandled error"
  );

  const message =
    process.env.NODE_ENV === "production"
      ? "服务器内部错误，请稍后重试"
      : `服务器错误: ${
          err instanceof Error ? err.message : String(err)
        }`;

  return errorResponse(
    res,
    500,
    BusinessCode.SYSTEM_ERROR,
    message,
    path,
    "INTERNAL_SERVER_ERROR"
  );
};
