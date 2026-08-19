// server/src/middleware/error.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { BusinessCode } from '../types/business-code.enum';
import { ResponseUtil } from '../utils/response.util';

/**
 * 全局错误处理中间件
 * 捕获所有路由中 next(err) 或 throw 的错误
 * 必须放在所有路由之后注册
 */
export class ErrorMiddleware {
  /**
   * 错误处理主函数
   */
  static handle(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // 1. 记录错误日志（方便排查问题）
    console.error('=== 错误日志 ===');
    console.error('路径:', req.path);
    console.error('方法:', req.method);
    console.error('错误信息:', err.message);
    console.error('错误堆栈:', err.stack);
    console.error('错误详情:', err);

    // 2. 根据错误类型返回不同的响应

    // Prisma 数据库错误：唯一约束冲突 (P2002)
    if (err.code === 'P2002') {
      ResponseUtil.dataExists(res, '数据已存在，请勿重复添加');
      return;
    }

    // Prisma 数据库错误：记录不存在 (P2025)
    if (err.code === 'P2025') {
      ResponseUtil.notFound(res, '操作的数据不存在');
      return;
    }

    // 业务自定义错误（带有 code 和 message）
    if (err.code && typeof err.code === 'number') {
      ResponseUtil.error(
        res,
        err.code as BusinessCode,
        err.message || '业务处理失败'
      );
      return;
    }

    // 其他未分类的错误：统一返回系统错误
    ResponseUtil.systemError(
      res,
      err.message || '服务器内部错误，请稍后重试'
    );
  }
}
