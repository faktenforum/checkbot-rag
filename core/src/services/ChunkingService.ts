import { config } from "../config";
import type { ClaimJson, ClaimFact, ClaimSource } from "../types/claim";
import type { Chunk, ChunkMetadata } from "../types/chunking";

export class ChunkingService {
  private readonly maxChunkChars: number;

  constructor() {
    this.maxChunkChars = config.chunking.maxChunkChars;
  }

  // Produces structured chunks for a single fact-check claim.
  // Strategy:
  //   1. claim_overview — synthesizes the claim statement and verdict fields
  //   2. fact_detail (one per fact) — the full fact text + source excerpts
  chunkClaim(claim: ClaimJson): Chunk[] {
    const metadata = this.buildBaseMetadata(claim);
    const chunks: Chunk[] = [];

    chunks.push(this.buildOverviewChunk(claim, metadata));

    for (const fact of claim.facts.filter((f) => f.publish !== false)) {
      const factChunks = this.buildFactChunks(fact, metadata);
      chunks.push(...factChunks);
    }

    return chunks;
  }

  private buildBaseMetadata(claim: ClaimJson): ChunkMetadata {
    return {
      claimId: claim.id,
      externalId: claim.id,
      shortId: claim.shortId,
      chunkType: "claim_overview",
      factIndex: null,
      ratingLabel: claim.ratingLabelName,
      categories: claim.claimCategories.map((c) => c.categoryName),
      publishingDate: claim.createdAt,
      publishingUrl: claim.publishingUrl,
      status: claim.status,
    };
  }

  // claim_overview chunk: synopsis + rating verdict + categories
  // Provides a concise, searchable summary of the entire fact-check.
  private buildOverviewChunk(claim: ClaimJson, meta: ChunkMetadata): Chunk {
    const parts: string[] = [];

    if (claim.synopsis) {
      parts.push(`Behauptung: ${claim.synopsis}`);
    }

    if (claim.ratingSummary) {
      parts.push(`Bewertung: ${claim.ratingSummary}`);
    }

    if (claim.ratingStatement) {
      parts.push(`Einschätzung: ${claim.ratingStatement}`);
    }

    if (claim.ratingLabelName) {
      parts.push(`Urteil: ${claim.ratingLabelName}`);
    }

    const categoryLabels = claim.claimCategories
      .map((c) => c.category.labelDe)
      .join(", ");
    if (categoryLabels) {
      parts.push(`Kategorien: ${categoryLabels}`);
    }

    if (claim.shortId) {
      parts.push(`ID: ${claim.shortId}`);
    }

    return {
      chunkType: "claim_overview",
      factIndex: null,
      content: parts.join("\n\n"),
      metadata: { ...meta, chunkType: "claim_overview" },
    };
  }

  // fact_detail chunk: individual fact text + relevant source excerpts.
  // Long facts (> maxChunkChars) are split at sentence boundaries with overlap.
  private buildFactChunks(fact: ClaimFact, meta: ChunkMetadata): Chunk[] {
    const excerpts = fact.sources
      .filter((s) => s.publish !== false && s.excerpt)
      .map((s: ClaimSource) => `Quelle: ${s.excerpt}`)
      .join("\n");

    const fullContent = excerpts
      ? `${fact.text}\n\n${excerpts}`
      : fact.text;

    const factMeta: ChunkMetadata = {
      ...meta,
      chunkType: "fact_detail",
      factIndex: fact.index,
    };

    if (fullContent.length <= this.maxChunkChars) {
      return [
        {
          chunkType: "fact_detail",
          factIndex: fact.index,
          content: fullContent,
          metadata: factMeta,
        },
      ];
    }

    // Split long content at sentence boundaries with ~20% overlap
    return this.splitAtSentences(fullContent, factMeta);
  }

  // Splits text at sentence boundaries when it exceeds maxChunkChars.
  // Overlap preserves context between chunks (~20% of maxChunkChars).
  private splitAtSentences(text: string, meta: ChunkMetadata): Chunk[] {
    const overlapChars = Math.floor(this.maxChunkChars * 0.2);
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: Chunk[] = [];

    let current = "";
    let overlap = "";

    for (const sentence of sentences) {
      if ((current + sentence).length > this.maxChunkChars && current) {
        chunks.push({
          chunkType: "fact_detail",
          factIndex: meta.factIndex,
          content: current.trim(),
          metadata: meta,
        });
        // Keep last ~overlapChars as context for the next chunk
        overlap = current.slice(-overlapChars);
        current = overlap + " " + sentence;
      } else {
        current += (current ? " " : "") + sentence;
      }
    }

    if (current.trim()) {
      chunks.push({
        chunkType: "fact_detail",
        factIndex: meta.factIndex,
        content: current.trim(),
        metadata: meta,
      });
    }

    return chunks;
  }
}

export const chunkingService = new ChunkingService();
