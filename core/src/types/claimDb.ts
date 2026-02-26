export interface ClaimChunk {
  id: number;
  chunk_type: string;
  fact_index: number | null;
  content: string;
  metadata: Record<string, unknown>;
}

export type ClaimWithChunksRow = {
  chunks: ClaimChunk[];
} & Record<string, unknown>;

export interface ListClaimsFilters {
  page: number;
  limit: number;
  ratingLabel?: string;
  category?: string;
  status?: string;
}

export interface ClaimListRow {
  id: string;
  external_id: string;
  short_id: string;
  status: string;
  synopsis: string | null;
  rating_label: string | null;
  rating_summary: string | null;
  categories: string[];
  publishing_url: string | null;
  publishing_date: string | null;
  language: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ListClaimsResult {
  data: ClaimListRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

