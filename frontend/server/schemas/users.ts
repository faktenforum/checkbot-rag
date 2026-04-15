import { z } from "zod";
import { PERMISSIONS } from "@checkbot/core";

const PermissionsSchema = z.array(z.enum(PERMISSIONS));

export const CreateUserSchema = z.object({
  userType: z.enum(["human", "service"]),
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  password: z.string().min(8).optional(),
  permissions: PermissionsSchema,
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().nullable(),
  permissions: PermissionsSchema.optional(),
  active: z.boolean().optional(),
});

export const UpdatePasswordSchema = z.object({
  password: z.string().min(8),
});

export const UserListQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  userType: z.enum(["human", "service"]).optional(),
  includeInactive: z.coerce.boolean().default(false),
});
