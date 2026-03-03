// API response types — must match backend DTOs
import type { ClaimStatus, SearchLanguage as CoreSearchLanguage } from "@checkbot/core";

export type { ClaimStatus };

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

export type SearchLanguage = CoreSearchLanguage;

export interface SearchRequest {
  query: string;
  limit?: number;
  categories?: string[];
  ratingLabel?: string;
  chunkType?: "all" | "overview" | "fact_detail";
  language?: SearchLanguage;
  status?: ClaimStatus;
  internal?: boolean;
  enableFts?: boolean;
  enableVec?: boolean;
}

export interface ClaimListItem {
  id: string;
  external_id: string;
  short_id: string;
  status: ClaimStatus;
  synopsis: string | null;
  rating_label: string | null;
  rating_summary: string | null;
  categories: string[];
  publishing_url: string | null;
  publishing_date: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClaimListResponse {
  data: ClaimListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface StatsResponse {
  claims: {
    total: number;
    byStatus: Record<string, number>;
  };
  chunks: {
    total: number;
    byType: Record<string, number>;
    embedded: number;
  };
  ratingLabels: Array<{ rating_label: string; count: number }>;
  categories: Array<{ category: string; count: number }>;
}

export interface ClaimChunk {
  id: number;
  chunk_type: string;
  fact_index: number | null;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ClaimDetail extends ClaimListItem {
  rating_statement: string | null;
  raw_data: unknown;
  chunks: ClaimChunk[];
}

export interface ImportJobStatus {
  id: string;
  status: "pending" | "running" | "done" | "failed" | "canceled";
  source: string;
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  createdAt: string;
}

export interface ImportRequest {
  filePath: string;
  language: string;
}
