// src/types/api.types.ts

import { BusinessCode, ErrorType } from './api.enum';

/**
 * 统一API响应格式
 * 后端返回的数据结构
 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码 */
  code: BusinessCode;
  /** 提示信息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 时间戳 */
  timestamp: number;
  /** 请求路径（可选） */
  path?: string;
}

/**
 * API错误对象
 * 经过错误处理器统一格式化后的错误
 */
export interface ApiError {
  /** 业务状态码 */
  code: BusinessCode;
  /** 错误信息 */
  message: string;
  /** 错误类型 */
  type: ErrorType;
  /** 错误详情（可选） */
  details?: unknown;
  /** 时间戳 */
  timestamp: number;
}

/**
 * API请求配置
 */
export interface ApiRequestConfig {
  /** 是否显示加载状态 */
  showLoading?: boolean;
  /** 是否显示错误提示 */
  showError?: boolean;
  /** 重试次数 */
  retryCount?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 分页请求参数
 */
export interface PageParams {
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应数据
 */
export interface PageResult<T> {
  /** 数据列表 */
  items: T[];
  /** 总条数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 带分页的统一响应格式
 */
export type ApiPageResponse<T> = ApiResponse<PageResult<T>>;

/**
 * 列表查询参数（带分页和筛选）
 */
export interface ListQueryParams extends PageParams {
  /** 关键词搜索 */
  keyword?: string;
  /** 状态筛选 */
  status?: string | number;
  /** 开始时间 */
  startDate?: string;
  /** 结束时间 */
  endDate?: string;
  /** 其他筛选条件 */
  [key: string]: unknown;
}
