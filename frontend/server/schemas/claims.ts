import { CLAIM_STATUS_VALUES } from "@checkbot/core";
import { z } from "zod";

export const GetClaimsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  ratingLabel: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(CLAIM_STATUS_VALUES).optional(),
});

