/**
 * The single response envelope for every boundary in DevFlow: HTTP responses from
 * the backend AND messages passed between extension contexts. One shape means one
 * error-handling path in callers, instead of per-transport special cases.
 */

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  TIMEOUT: 'TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiErrorBody {
  readonly code: ErrorCode;
  readonly message: string;
  /** Safe-to-expose context only. Never stack traces, never upstream payloads. */
  readonly details?: Record<string, unknown>;
}

export interface ApiSuccess<TData> {
  readonly success: true;
  readonly data: TData;
}

export interface ApiFailure {
  readonly success: false;
  readonly error: ApiErrorBody;
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

export function ok<TData>(data: TData): ApiSuccess<TData> {
  return { success: true, data };
}

export function fail(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ApiFailure {
  return { success: false, error: details ? { code, message, details } : { code, message } };
}

/** Named branch types matter here: a structurally-equivalent predicate without the
 * readonly modifiers narrows the true branch but cannot subtract it from the false one. */
export function isOk<TData>(response: ApiResponse<TData>): response is ApiSuccess<TData> {
  return response.success;
}
