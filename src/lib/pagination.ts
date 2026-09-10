export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10))
  );
  return { page, pageSize };
}

export function toPaginatedResult<T>(
  items: T[],
  total: number,
  { page, pageSize }: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / pageSize);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function paginationToSkipTake({ page, pageSize }: PaginationParams): {
  skip: number;
  take: number;
} {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
