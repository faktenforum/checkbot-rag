import { z } from "zod";

export const AuditLogQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().uuid().optional(),
  from: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
  to: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
});
