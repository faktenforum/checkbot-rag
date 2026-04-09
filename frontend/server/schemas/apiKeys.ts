import { z } from "zod";
import { PERMISSIONS } from "@checkbot/core";

const PermissionsSchema = z.array(z.enum(PERMISSIONS));

export const CreateApiKeySchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  permissions: PermissionsSchema,
  rateLimitPoints: z.number().int().positive().optional().nullable(),
  rateLimitDurationSec: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional().nullable().transform((v) => v ? new Date(v) : null),
});

export const UpdateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  permissions: PermissionsSchema.optional(),
  rateLimitPoints: z.number().int().positive().optional().nullable(),
  rateLimitDurationSec: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional().nullable().transform((v) => v ? new Date(v) : null),
  active: z.boolean().optional(),
});

export const ApiKeyListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  userId: z.string().uuid().optional(),
  includeInactive: z.coerce.boolean().default(false),
});
