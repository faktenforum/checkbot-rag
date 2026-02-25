import { z } from "zod";

export const JobIdParamSchema = z.string().uuid();

export const ImportFromFileSchema = z.object({
  filePath: z.string(),
});

