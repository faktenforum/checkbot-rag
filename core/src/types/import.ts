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
   // Optional language configured for this import job (e.g. 'de', 'en').
  language?: string;
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

export interface ImportJobRow {
  id: string;
  status: string;
  source: string;
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  canceled_at: Date | null;
  created_at: Date;
  language: string | null;
}

