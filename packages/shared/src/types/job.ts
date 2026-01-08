export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: number; // 0 or 1 (SQLite boolean)
  description: string | null;
  requirements: string | null; // JSON string: ["3+ years", "React"]
  salary_min: number | null;
  salary_max: number | null;
  posted_date: number;
  created_at: number;
  contract_time: string | null; // full_time, part_time, etc.
  contract_type: string | null; // permanent, contract, temporary
  category_tag: string | null; // e.g., "it-jobs"
  category_label: string | null; // e.g., "IT Jobs"
  salary_is_predicted: number; // 0 or 1 (whether salary is estimated)
  latitude: number | null;
  longitude: number | null;
  source: string | null; // 'adzuna', 'manual', etc.
  external_url: string | null;
  is_complete?: number; // 0 or 1 (whether job has complete description) - NEW
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  created_at: number;
}

export interface JobWithRequirements extends Omit<Job, 'requirements' | 'remote'> {
  requirements: string[];
  remote: boolean;
}

export interface JobWithSavedStatus extends Job {
  saved: boolean;
}
