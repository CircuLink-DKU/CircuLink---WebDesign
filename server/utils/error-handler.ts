// src/utils/error-handler.ts

import { AxiosError } from 'axios';
import { HttpStatusCode, BusinessCode, ErrorType } from '@/types/api.enum';
import { ApiError } from '@/types/api.types';

/**
 * 自定义API异常类
 * 用于在业务代码中主动抛出统一的错误
 */
export class ApiException extends Error {
  public readonly code: BusinessCode;
  public readonly type: ErrorType;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: BusinessCode = BusinessCode.FAIL,
    type: ErrorType = ErrorType.UNKNOWN,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiException';
    this.code = code;
    this.type = type;
    this.details = details;
  }
}

/**
 * 网络异常类
 */
export class NetworkException extends ApiException {
  constructor(message: string = '网络连接失败，请检查网络设置', details?: unknown) {
    super(message, BusinessCode.SYSTEM_ERROR, ErrorType.NETWORK, details);
  }
}

/**
 * 超时异常类
 */
export class TimeoutException extends ApiException {
  constructor(message: string = '请求超时，请稍后重试', details?: unknown) {
    super(message, BusinessCode.SYSTEM_ERROR, ErrorType.TIMEOUT, details);
  }
}

/**
 * 错误处理器
 * 将各种来源的错误统一转换为 ApiError 格式
 */
export class ErrorHandler {
  /**
   * 处理各种类型的错误，统一转换为 ApiError 格式
   */
  static handle(error: unknown): ApiError {
    // 如果是自定义异常（ApiException 的实例）
    if (error instanceof ApiException) {
      return {
        code: error.code,
        message: error.message,
        type: error.type,
        details: error.details,
        timestamp: Date.now(),
      };
    }

    // 如果是 Axios 错误（网络请求产生的错误）
    if (this.isAxiosError(error)) {
      return this.handleAxiosError(error);
    }

    // 如果是普通的 JavaScript Error 对象
    if (error instanceof Error) {
      return {
        code: BusinessCode.FAIL,
        message: error.message || '未知错误',
        type: ErrorType.UNKNOWN,
        details: error.stack,
        timestamp: Date.now(),
      };
    }

    // 其他未知类型错误（比如字符串、数字等）
    return {
      code: BusinessCode.FAIL,
      message: String(error) || '未知错误',
      type: ErrorType.UNKNOWN,
      details: error,
      timestamp: Date.now(),
    };
  }

  /**
   * 判断是否为 Axios 错误
   */
  private static isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as { isAxiosError?: boolean }).isAxiosError === true
    );
  }

  /**
   * 专门处理 Axios 错误
   */
  private static handleAxiosError(error: AxiosError): ApiError {
    // 情况1：网络错误（没有收到响应）
    if (!error.response) {
      return {
        code: BusinessCode.SYSTEM_ERROR,
        message: '网络连接失败，请检查网络设置',
        type: ErrorType.NETWORK,
        details: error,
        timestamp: Date.now(),
      };
    }

    const status = error.response.status;
    const data = error.response.data as { message?: string } | undefined;

    // 情况2：根据 HTTP 状态码分类处理
    switch (status) {
      case HttpStatusCode.UNAUTHORIZED: // 401
        return {
          code: BusinessCode.AUTH_ERROR,
          message: '登录已过期，请重新登录',
          type: ErrorType.BUSINESS,
          details: data,
          timestamp: Date.now(),
        };

      case HttpStatusCode.FORBIDDEN: // 403
        return {
          code: BusinessCode.PERMISSION_DENIED,
          message: '没有权限访问该资源',
          type: ErrorType.BUSINESS,
          details: data,
          timestamp: Date.now(),
        };

      case HttpStatusCode.NOT_FOUND: // 404
        return {
          code: BusinessCode.DATA_NOT_FOUND,
          message: '请求的资源不存在',
          type: ErrorType.BUSINESS,
          details: data,
          timestamp: Date.now(),
        };

      case HttpStatusCode.BAD_REQUEST: // 400
        return {
          code: BusinessCode.PARAM_ERROR,
          message: data?.message || '请求参数错误',
          type: ErrorType.BUSINESS,
          details: data,
          timestamp: Date.now(),
        };

      case HttpStatusCode.INTERNAL_SERVER_ERROR: // 500
      case HttpStatusCode.BAD_GATEWAY: // 502
      case HttpStatusCode.SERVICE_UNAVAILABLE: // 503
      case HttpStatusCode.GATEWAY_TIMEOUT: // 504
        return {
          code: BusinessCode.SYSTEM_ERROR,
          message: '服务器繁忙，请稍后重试',
          type: ErrorType.SERVER,
          details: data,
          timestamp: Date.now(),
        };

      default:
        return {
          code: BusinessCode.FAIL,
          message: data?.message || `请求失败 (HTTP ${status})`,
          type: ErrorType.UNKNOWN,
          details: data,
          timestamp: Date.now(),
        };
    }
  }
}
