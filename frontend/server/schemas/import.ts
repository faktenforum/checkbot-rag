import { IMPORT_LANGUAGE_CODES } from "@checkbot/core";
import { z } from "zod";

export const JobIdParamSchema = z.string().uuid();

export const ImportFromFileSchema = z.object({
  filePath: z.string(),
  language: z.enum(IMPORT_LANGUAGE_CODES).default("de"),
});

