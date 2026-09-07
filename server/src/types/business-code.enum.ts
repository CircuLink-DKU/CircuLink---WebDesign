// server/src/types/business-code.enum.ts

/**
 * 业务状态码枚举
 * ⚠️ 必须与前端 src/types/api.enum.ts 中的 BusinessCode 保持一致
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
