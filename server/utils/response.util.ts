// server/src/utils/response.util.ts

import { Response } from 'express';
import { BusinessCode } from '../types/business-code.enum';

/**
 * 统一响应工具类
 * 所有 API 接口都通过这个工具返回响应，确保格式一致
 */
export class ResponseUtil {
  /**
   * 成功响应 (code = 0)
   * @param res Express Response 对象
   * @param data 返回的数据
   * @param message 成功消息，默认为 'success'
   */
  static success<T>(
    res: Response,
    data: T,
    message: string = 'success'
  ): Response {
    return res.status(200).json({
      code: BusinessCode.SUCCESS,
      message,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * 错误响应 (自定义错误码)
   * @param res Express Response 对象
   * @param code 业务错误码
   * @param message 错误信息
   * @param details 错误详情（可选）
   */
  static error(
    res: Response,
    code: BusinessCode = BusinessCode.FAIL,
    message: string = '操作失败',
    details?: any
  ): Response {
    return res.status(200).json({
      code,
      message,
      data: null,
      timestamp: Date.now(),
      details,
    });
  }

  /**
   * 参数错误响应 (code = 1001)
   */
  static paramError(
    res: Response,
    message: string = '参数错误，请检查输入'
  ): Response {
    return this.error(res, BusinessCode.PARAM_ERROR, message);
  }

  /**
   * 认证错误响应 (code = 1002)
   */
  static authError(
    res: Response,
    message: string = '认证失败，请重新登录'
  ): Response {
    return this.error(res, BusinessCode.AUTH_ERROR, message);
  }

  /**
   * 权限不足响应 (code = 1003)
   */
  static permissionDenied(
    res: Response,
    message: string = '权限不足，无法访问该资源'
  ): Response {
    return this.error(res, BusinessCode.PERMISSION_DENIED, message);
  }

  /**
   * 数据不存在响应 (code = 1004)
   */
  static notFound(
    res: Response,
    message: string = '数据不存在'
  ): Response {
    return this.error(res, BusinessCode.DATA_NOT_FOUND, message);
  }

  /**
   * 数据已存在响应 (code = 1005)
   */
  static dataExists(
    res: Response,
    message: string = '数据已存在，请勿重复添加'
  ): Response {
    return this.error(res, BusinessCode.DATA_EXISTS, message);
  }

  /**
   * 系统错误响应 (code = 5000)
   */
  static systemError(
    res: Response,
    message: string = '系统错误，请稍后重试'
  ): Response {
    return this.error(res, BusinessCode.SYSTEM_ERROR, message);
  }
}
