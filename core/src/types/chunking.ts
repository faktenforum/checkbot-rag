export interface Chunk {
  chunkType: "claim_overview" | "fact_detail";
  factIndex: number | null;
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  claimId: string;
  externalId: string;
  shortId: string;
  chunkType: "claim_overview" | "fact_detail";
  factIndex: number | null;
  ratingLabel: string | null;
  categories: string[];
  publishingDate: string | null;
  publishingUrl: string | null;
  status: string;
}

