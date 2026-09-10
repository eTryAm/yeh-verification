import { NextResponse } from "next/server";
import { isAppError } from "./errors";
import { ZodError } from "zod";

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Success helpers ──────────────────────────────────────────────────────────

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

// ─── Error helpers ────────────────────────────────────────────────────────────

export function errorResponse(
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string[]>
): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: { code, message, ...(fields ? { fields } : {}) } },
    { status }
  );
}

/**
 * Convert any thrown error into a consistent API error response.
 * Use in every route handler's catch block.
 */
export function handleRouteError(err: unknown): NextResponse<ApiError> {
  console.error("[API Error]", err);

  if (isAppError(err)) {
    return errorResponse(err.code, err.message, err.statusCode);
  }

  if (err instanceof ZodError) {
    const fields: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".");
      if (!fields[key]) fields[key] = [];
      fields[key].push(issue.message);
    }
    return errorResponse("VALIDATION_ERROR", "Invalid request data", 422, fields);
  }

  return errorResponse(
    "INTERNAL_SERVER_ERROR",
    "An unexpected error occurred",
    500
  );
}
