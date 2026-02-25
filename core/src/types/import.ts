export type ImportJobStatusValue =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "canceled";

export interface ImportJobStatus {
  id: string;
  status: ImportJobStatusValue;
  source: string;
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  canceledAt?: Date;
  createdAt: Date;
}

export interface ImportResult {
  jobId: string;
  total: number;
  processed: number;
  skipped: number;
  errors: number;
}

