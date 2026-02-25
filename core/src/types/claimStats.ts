export interface CategoryCountRow {
  category: string;
  count: number;
}

export interface RatingLabelCountRow {
  rating_label: string;
  count: number;
}

export interface ClaimStatsOverview {
  claims: {
    total: number;
    byStatus: Record<string, number>;
  };
  chunks: {
    total: number;
    byType: Record<string, number>;
    embedded: number;
  };
  ratingLabels: RatingLabelCountRow[];
  categories: CategoryCountRow[];
}

