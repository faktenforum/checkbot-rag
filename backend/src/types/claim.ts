// TypeScript types matching the faktenforum claims JSON export format

export interface ClaimFile {
  id: string;
  mimeType: string;
  name: string;
  transcription: string | null;
  credit: string | null;
  caption: string | null;
}

export interface ClaimUser {
  id: string;
  username: string;
}

export interface ClaimCategory {
  id: string;
  categoryName: string;
  category: {
    labelDe: string;
    labelEn: string;
  };
}

export interface ClaimSource {
  id: string;
  index: number;
  excerpt: string | null;
  archiveUrl: string | null;
  url: string | null;
  publish: boolean;
  remarks: string | null;
  createdAt: string;
  createdByUser: ClaimUser | null;
  updatedAt: string;
  updatedByUser: ClaimUser | null;
  file: ClaimFile | null;
}

export interface ClaimFact {
  id: string;
  index: number;
  text: string;
  publish: boolean;
  createdAt: string;
  createdByUser: ClaimUser | null;
  updatedAt: string;
  updatedByUser: ClaimUser | null;
  sources: ClaimSource[];
}

export interface ClaimOrigin {
  id: string;
  claimId: string;
  index: number;
  excerpt: string | null;
  archiveUrl: string | null;
  url: string | null;
  publish: boolean;
  remarks: string | null;
  createdAt: string;
  createdByUser: ClaimUser | null;
  updatedAt: string;
  updatedByUser: ClaimUser | null;
  file: ClaimFile | null;
}

export interface ClaimCheckworthiness {
  category: string;
  confidence: number;
}

export type ClaimStatus =
  | "submitted"
  | "accepted"
  | "observed"
  | "stale"
  | "spam"
  | "rejected"
  | "checked"
  | "published";

export interface ClaimJson {
  id: string;
  status: ClaimStatus;
  submitterNotes: string | null;
  shortId: string;
  processId: number;
  synopsis: string | null;
  ratingLabelName: string | null;
  ratingStatement: string | null;
  ratingSummary: string | null;
  createdAt: string;
  createdBy: string;
  internal: boolean;
  publishingUrl: string | null;
  publishedVersionId: string | null;
  editorialImageFile: ClaimFile | null;
  checkworthiness: ClaimCheckworthiness | null;
  createdByUser: ClaimUser | null;
  updatedByUser: ClaimUser | null;
  claimCategories: ClaimCategory[];
  origins: ClaimOrigin[];
  facts: ClaimFact[];
}
