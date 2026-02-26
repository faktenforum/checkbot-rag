export type SearchLanguage =
  | "auto"
  | "de"
  | "en"
  | "fr"
  | "es"
  | "it"
  | "pt"
  | "nl"
  | "da"
  | "fi"
  | "no"
  | "nb"
  | "nn"
  | "ru"
  | "sv"
  | "tr"
  | "ro"
  | "hu"
  | "id";

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
  bestScore: number;
  chunks: SearchResultChunk[];
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  claims: SearchResultClaim[];
}

