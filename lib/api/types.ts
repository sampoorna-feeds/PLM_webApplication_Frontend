/**
 * API response types
 * Define types for API responses here
 */

/**
 * OData V4 response wrapper
 */
export interface ODataResponse<T> {
  "@odata.context": string;
  value: T[];
  "@odata.count"?: number;
}

/**
 * OData V4 single entity response
 */
export interface ODataEntity<T> {
  "@odata.context": string;
  [key: string]: unknown;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    target?: string;
    details?: Array<{
      code: string;
      message: string;
      target?: string;
    }>;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}
