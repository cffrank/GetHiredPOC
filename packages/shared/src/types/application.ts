import { Job } from './job';

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  notes: string | null;
  ai_match_score: number | null; // 0-100
  ai_analysis: string | null; // JSON string
  applied_date: number | null;
  created_at: number;
  updated_at: number;
}

export interface ApplicationWithJob extends Application {
  job: Job;
}

export interface AIAnalysis {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendations: string[];
  summary: string;
}

export interface ApplicationWithAnalysis extends Omit<Application, 'ai_analysis'> {
  ai_analysis: AIAnalysis | null;
}
