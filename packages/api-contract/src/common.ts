export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type Data = Record<string, Json>;

export interface ApiResponse<T> {
  code: number;
  data: T;
  msg: string;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
  pageNo: number;
  pageSize: number;
}

export interface PagerParams {
  pageNo?: number;
  pageSize?: number;
}
