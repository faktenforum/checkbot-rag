import { IMPORT_LANGUAGE_CODES } from "@checkbot/core";
import { z } from "zod";

export const JobIdParamSchema = z.string().uuid();

export const ImportFromFileSchema = z.object({
  filePath: z.string(),
  language: z.enum(IMPORT_LANGUAGE_CODES).default("de"),
});

// Minimal shape check — validates required fields, passes unknown fields through.
// Full structural validation happens downstream in the chunking/import pipeline.
const ClaimJsonSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    shortId: z.string(),
    processId: z.number(),
    createdAt: z.string(),
    createdBy: z.string(),
    internal: z.boolean(),
  })
  .passthrough();

export const ImportFromJsonSchema = z.object({
  claims: z.array(ClaimJsonSchema).min(1),
  language: z.enum(IMPORT_LANGUAGE_CODES).default("de"),
  source: z.string().optional(),
});

