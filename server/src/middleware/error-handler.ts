import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../utils/errors.js";
import { logger } from "../lib/logger.js";
import { BusinessCode } from "../types/business-code.enum.js";

// 统一的错误响应格式
const errorResponse = (
  res: Response,
  status: number,
  code: BusinessCode | number,
  message: string,
  path?: string
) => {
  return res.status(status).json({
    code: typeof code === 'number' ? code : BusinessCode.FAIL,
    message,
    data: null,
    timestamp: Date.now(),
    path: path || '',
  });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const path = req.path;

  // 1. Multer 文件上传错误
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return errorResponse(
        res,
        413,
        BusinessCode.PARAM_ERROR,
        "文件过大，最大允许 10MB",
        path
      );
    }
    return errorResponse(
      res,
      400,
      BusinessCode.PARAM_ERROR,
      `上传错误: ${err.message}`,
      path
    );
  }

  // 2. 请求体过大错误
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
      path
    );
  }

  // 3. Zod 验证错误
  if (err instanceof ZodError) {
    return errorResponse(
      res,
      400,
      BusinessCode.PARAM_ERROR,
      `参数验证失败: ${err.message}`,
      path
    );
  }

  // 4. 自定义 HttpError
  if (err instanceof HttpError) {
    let code = BusinessCode.FAIL;
    // 根据 HTTP 状态码映射业务状态码
    if (err.status === 401) code = BusinessCode.AUTH_ERROR;
    else if (err.status === 403) code = BusinessCode.PERMISSION_DENIED;
    else if (err.status === 404) code = BusinessCode.DATA_NOT_FOUND;
    else if (err.status === 409) code = BusinessCode.DATA_EXISTS;
    else if (err.status === 400) code = BusinessCode.PARAM_ERROR;
    
    return errorResponse(
      res,
      err.status,
      code,
      err.message || "请求失败",
      path
    );
  }

  // 5. Prisma 数据库错误
  if (err && typeof err === 'object' && 'code' in err) {
    const prismaError = err as { code: string; message?: string };
    
    // 唯一约束冲突
    if (prismaError.code === 'P2002') {
      return errorResponse(
        res,
        409,
        BusinessCode.DATA_EXISTS,
        '数据已存在，请勿重复添加',
        path
      );
    }
    
    // 记录不存在
    if (prismaError.code === 'P2025') {
      return errorResponse(
        res,
        404,
        BusinessCode.DATA_NOT_FOUND,
        '操作的数据不存在',
        path
      );
    }
  }

  // 6. 未分类的其他错误
  logger.error({ err, requestId: req.requestId }, "Unhandled error");
  return errorResponse(
    res,
    500,
    BusinessCode.SYSTEM_ERROR,
    process.env.NODE_ENV === 'production' 
      ? '服务器内部错误，请稍后重试' 
      : `服务器错误: ${err instanceof Error ? err.message : String(err)}`,
    path
  );
};
