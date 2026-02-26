const EXPLICIT_LANGUAGE_CODES = [
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
] as const;

export const SEARCH_LANGUAGE_CODES = [
  "auto",
  ...EXPLICIT_LANGUAGE_CODES,
] as const;

export type SearchLanguage = (typeof SEARCH_LANGUAGE_CODES)[number];

/** Languages accepted for import (no "auto"). Use for import API schema. */
export const IMPORT_LANGUAGE_CODES = EXPLICIT_LANGUAGE_CODES;

const FTS_CONFIG_BY_LANGUAGE: Record<string, string> = {
  de: "german",
  en: "english",
  fr: "french",
  es: "spanish",
  it: "italian",
  pt: "portuguese",
  nl: "dutch",
  da: "danish",
  fi: "finnish",
  no: "norwegian",
  nb: "norwegian",
  nn: "norwegian",
  ru: "russian",
  sv: "swedish",
  tr: "turkish",
  ro: "romanian",
  hu: "hungarian",
  id: "indonesian",
};

export function getFtsConfig(language: string): string {
  return FTS_CONFIG_BY_LANGUAGE[language] ?? "simple";
}

export const AUTO_LANGUAGE_ERROR_MESSAGE =
  "Search language 'auto' is not supported yet; please pass an explicit language code.";

export interface SearchOptions {
  query: string;
  limit?: number;
  categories?: string[];
  ratingLabel?: string;
  // 'all': claim_overview + fact_detail (default)
  // 'overview': only claim_overview chunks
  chunkType?: "all" | "overview" | "fact_detail";
  /**
   * Optional language hint for the query, e.g. 'de', 'en', or 'auto'.
   * If omitted, the backend falls back to 'auto' (automatic detection).
   */
  language?: SearchLanguage;
}

export interface SearchResultChunk {
  chunkId: number;
  claimId: string;
  externalId: string;
  shortId: string;
  chunkType: string;
  factIndex: number | null;
  content: string;
  metadata: Record<string, unknown>;
  rrfScore: number;
  vecScore?: number;
  ftsScore?: number;
}

export interface SearchResultClaim {
  externalId: string;
  shortId: string;
  synopsis: string | null;
  ratingLabel: string | null;
  ratingSummary: string | null;
  ratingStatement: string | null;
  categories: string[];
  publishingUrl: string | null;
  publishingDate: string | null;
  status: string;
  language: string | null;
  bestScore: number;
  chunks: SearchResultChunk[];
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  claims: SearchResultClaim[];
}

