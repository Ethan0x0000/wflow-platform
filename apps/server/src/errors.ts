import { ZodError } from "zod";
import { WorkflowValidationError } from "wflow-core";
import { ApiError } from "./models.js";

export const INTERNAL_ERROR = "INTERNAL_ERROR";
export const INTERNAL_MESSAGE = "服务器内部错误，请稍后重试";

export interface RequestContext { method: string; path: string; tenant: string; }
export interface ErrorResponse { status: number; message: string; code: string; }

/** Maps any thrown value to the response contract without leaking internals. */
export function classifyError(error: unknown, context: RequestContext): ErrorResponse {
  if (error instanceof ApiError) return { status: error.status, message: error.message, code: error.code };
  if (error instanceof WorkflowValidationError) return { status: 422, message: error.code, code: "WORKFLOW_VALIDATION" };
  if (error instanceof ZodError || error instanceof SyntaxError) return { status: 422, message: "请求数据或流程配置不合法", code: "INVALID_REQUEST" };
  console.error("[workflow] unhandled request error", {
    ...context,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return { status: 500, message: INTERNAL_MESSAGE, code: INTERNAL_ERROR };
}
