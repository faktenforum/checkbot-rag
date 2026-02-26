import { z } from "zod";

export const JobIdParamSchema = z.string().uuid();

export const ImportFromFileSchema = z.object({
  filePath: z.string(),
  language: z
    .enum([
      "de",
      "en",
      "fr",
      "es",
      "it",
      "pt",
      "nl",
      "da",
      "fi",
      "no",
      "nb",
      "nn",
      "ru",
      "sv",
      "tr",
      "ro",
      "hu",
      "id",
    ])
    .default("de"),
});

