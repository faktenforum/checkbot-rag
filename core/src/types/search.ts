import type { ClaimStatus } from "./claim.js";
import type { SEARCH_LANGUAGE_CODES } from "../constants/search.js";

export type SearchLanguage = (typeof SEARCH_LANGUAGE_CODES)[number];

export interface SearchOptions {
  query: string;
  limit?: number;
  categories?: string[];
  ratingLabel?: string;
  // 'all': claim_overview + fact_detail (default)
  // 'overview': only claim_overview chunks
  chunkType?: "all" | "overview" | "fact_detail";
  /**
   * Language for full-text search (e.g. 'de', 'en'). Pass an explicit code;
   * 'auto' is not supported yet and will be rejected.
   */
  language?: SearchLanguage;
  /** Filter by claim status. Omit to include all statuses. */
  status?: ClaimStatus;
  /** Filter by internal flag. Omit = both; true = internal only; false = external only. */
  internal?: boolean;
  /** Enable full-text search. Defaults to true. */
  enableFts?: boolean;
  /** Enable vector search. Defaults to true. */
  enableVec?: boolean;
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
  status: ClaimStatus;
  internal: boolean;
  language: string | null;
  bestScore: number;
  chunks: SearchResultChunk[];
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  claims: SearchResultClaim[];
}

/** Internal DB row types for search queries */
export type VecRow = { id: number; vec_score: number; fts_score: null };
export type FtsRow = { id: number; vec_score: null; fts_score: number };
