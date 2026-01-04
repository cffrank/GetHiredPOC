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
