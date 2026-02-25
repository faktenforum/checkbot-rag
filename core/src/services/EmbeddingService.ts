import { config } from "../config";

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class EmbeddingService {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly dimensions: number;
  private readonly batchSize: number;

  constructor() {
    this.baseUrl = config.embedding.baseUrl.replace(/\/$/, "");
    this.model = config.embedding.model;
    this.apiKey = config.embedding.apiKey;
    this.dimensions = config.embedding.dimensions;
    this.batchSize = config.embedding.batchSize;
  }

  // Embed a single text. Retries up to 3 times on transient errors.
  async embedOne(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    const first = results[0];
    if (first === undefined) {
      throw new Error("embedBatch returned no result for single text");
    }
    return first;
  }

  // Embed multiple texts, batching requests to respect API limits.
  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const embeddings = await this.callApi(batch);
      results.push(...embeddings);
    }

    return results;
  }

  private async callApi(
    texts: string[],
    attempt = 0
  ): Promise<number[][]> {
    const maxAttempts = 3;
    const retryDelays = [1000, 2000, 4000];

    try {
      const body: Record<string, unknown> = {
        input: texts,
        model: this.model,
      };

      // Matryoshka dimension reduction — supported by Qwen3-Embedding-8B
      // Omit if using full dimensions to avoid unnecessary truncation
      if (this.dimensions !== 4096) {
        body.dimensions = this.dimensions;
      }

      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          // OpenRouter requires these headers; harmless for Scaleway
          "HTTP-Referer": "https://faktenforum.org",
          "X-Title": "Checkbot RAG",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Embedding API error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as EmbeddingResponse;

      // API returns embeddings in the same order as input
      return data.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    } catch (err) {
      if (attempt < maxAttempts - 1) {
        const delay = retryDelays[attempt];
        console.warn(
          `[EmbeddingService] Attempt ${attempt + 1} failed, retrying in ${delay}ms:`,
          (err as Error).message
        );
        await new Promise((r) => setTimeout(r, delay));
        return this.callApi(texts, attempt + 1);
      }
      throw err;
    }
  }

  // Format embedding as PostgreSQL vector literal: '[1.1,2.2,3.3]'
  static toSql(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
  }
}

export const embeddingService = new EmbeddingService();
