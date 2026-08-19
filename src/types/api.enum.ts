// src/types/api.enum.ts

/**
 * HTTP状态码枚举
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

/**
 * 业务状态码枚举（前后端统一约定）
 */
export enum BusinessCode {
  /** 操作成功 */
  SUCCESS = 0,
  /** 操作失败 */
  FAIL = 1,
  /** 参数错误 */
  PARAM_ERROR = 1001,
  /** 认证失败（未登录/token过期） */
  AUTH_ERROR = 1002,
  /** 权限不足 */
  PERMISSION_DENIED = 1003,
  /** 数据不存在 */
  DATA_NOT_FOUND = 1004,
  /** 数据已存在 */
  DATA_EXISTS = 1005,
  /** 系统错误 */
  SYSTEM_ERROR = 5000,
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  /** 网络错误 */
  NETWORK = 'NETWORK',
  /** 超时错误 */
  TIMEOUT = 'TIMEOUT',
  /** 服务器错误 */
  SERVER = 'SERVER',
  /** 业务逻辑错误 */
  BUSINESS = 'BUSINESS',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/**
 * API请求状态枚举（用于UI加载状态）
 */
export enum ApiStatus {
  /** 空闲 */
  IDLE = 'idle',
  /** 加载中 */
  LOADING = 'loading',
  /** 成功 */
  SUCCESS = 'success',
  /** 错误 */
  ERROR = 'error',
}
