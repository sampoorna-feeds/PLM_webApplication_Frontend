/**
 * API endpoint definitions
 * Centralized location for all API endpoints
 */

const BASE_PATH = '';

/**
 * Authentication endpoints
 */
export const authEndpoints = {
  // Add auth endpoints here when needed
} as const;

/**
 * Form endpoints
 * Each ERP form will have its own endpoint
 */
export const formEndpoints = {
  // Example: users: `${BASE_PATH}/Users`,
  // Add form endpoints here as they are defined
} as const;

/**
 * Helper to build OData query parameters
 */
export function buildODataQuery(params: {
  $filter?: string;
  $select?: string;
  $orderby?: string;
  $top?: number;
  $skip?: number;
  $expand?: string;
  $count?: boolean;
}): string {
  const queryParams = new URLSearchParams();
  
  if (params.$filter) queryParams.append('$filter', params.$filter);
  if (params.$select) queryParams.append('$select', params.$select);
  if (params.$orderby) queryParams.append('$orderby', params.$orderby);
  if (params.$top) queryParams.append('$top', params.$top.toString());
  if (params.$skip) queryParams.append('$skip', params.$skip.toString());
  if (params.$expand) queryParams.append('$expand', params.$expand);
  if (params.$count) queryParams.append('$count', 'true');

  return queryParams.toString();
}

