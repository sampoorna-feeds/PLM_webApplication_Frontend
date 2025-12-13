/**
 * Validation schemas using Zod
 * Centralized location for all validation schemas
 */

import { z } from 'zod';

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Export voucher validation
export * from './voucher.validation';

