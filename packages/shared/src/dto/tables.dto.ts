import { z } from 'zod';
import { TableStatus } from '../enums.js';

export const tableInput = z.object({
  number: z.string().min(1).max(16),
  capacity: z.number().int().min(1).max(99).default(4),
});
export type TableInput = z.infer<typeof tableInput>;

export const tableUpdate = z.object({
  number: z.string().min(1).max(16).optional(),
  capacity: z.number().int().min(1).max(99).optional(),
  status: z.enum([TableStatus.AVAILABLE, TableStatus.OCCUPIED, TableStatus.RESERVED, TableStatus.CLEANING]).optional(),
});
export type TableUpdate = z.infer<typeof tableUpdate>;
