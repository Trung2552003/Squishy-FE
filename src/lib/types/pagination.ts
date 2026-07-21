export interface PaginationRequest {
  pageIndex: number;
  pageSize: number;
  keyword?: string;
  startDate?: string;
  endDate?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
