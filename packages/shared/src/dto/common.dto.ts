import { z } from 'zod';

export const problemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  traceId: z.string().optional(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});
export type ProblemDetails = z.infer<typeof problemDetails>;

export const pagination = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type Pagination = z.infer<typeof pagination>;

export const paginated = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
