// Reciprocal Rank Fusion (RRF) combines multiple ranked result lists
// into a single ranking without requiring score normalization.
//
// Formula: rrf(d) = Σ weight_i / (k + rank_i(d))
// where k (default 60) controls how quickly the score decays with rank position.
// Higher k = more emphasis on top results; lower k = flatter distribution.
//
// Reference: Cormack et al. (2009) "Reciprocal Rank Fusion outperforms Condorcet
// and individual Rank Learning Methods"

export interface RankedResult {
  id: number;
  vecScore?: number;
  ftsScore?: number;
  vecRank?: number;
  ftsRank?: number;
  rrfScore: number;
}

export interface RawSearchResult {
  id: number;
  vecScore?: number;
  ftsScore?: number;
}

export function calculateRRF(
  vecRank: number | undefined,
  ftsRank: number | undefined,
  options: { weightVec: number; weightFts: number; k: number }
): number {
  const { weightVec, weightFts, k } = options;
  let score = 0;
  if (vecRank !== undefined) {
    score += weightVec / (k + vecRank);
  }
  if (ftsRank !== undefined) {
    score += weightFts / (k + ftsRank);
  }
  return score;
}

// Assign ranks within each result set and compute combined RRF scores.
export function applyRRF(
  results: RawSearchResult[],
  options: { weightVec: number; weightFts: number; k: number }
): RankedResult[] {
  const vecRanks = new Map<number, number>();
  const ftsRanks = new Map<number, number>();

  // Sort by vector score descending, assign 1-based ranks
  [...results]
    .filter((r) => r.vecScore !== undefined)
    .sort((a, b) => (b.vecScore ?? 0) - (a.vecScore ?? 0))
    .forEach((r, i) => vecRanks.set(r.id, i + 1));

  // Sort by FTS score descending, assign 1-based ranks
  [...results]
    .filter((r) => r.ftsScore !== undefined)
    .sort((a, b) => (b.ftsScore ?? 0) - (a.ftsScore ?? 0))
    .forEach((r, i) => ftsRanks.set(r.id, i + 1));

  return results
    .map((r) => ({
      id: r.id,
      vecScore: r.vecScore,
      ftsScore: r.ftsScore,
      vecRank: vecRanks.get(r.id),
      ftsRank: ftsRanks.get(r.id),
      rrfScore: calculateRRF(vecRanks.get(r.id), ftsRanks.get(r.id), options),
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore);
}
