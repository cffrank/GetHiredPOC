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
  score: number;
  recommendation: 'strong' | 'good' | 'fair' | 'weak';
  strengths: string[];
  gaps: string[];
  tip: string;
}

export interface ApplicationWithAnalysis extends Omit<Application, 'ai_analysis'> {
  ai_analysis: AIAnalysis | null;
}

// Generated Content Types (versioned resumes and cover letters)

export interface ResumeSection {
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    dates: string;
    highlights: string[];
  }>;
  skills: string[];
  education: Array<{
    school: string;
    degree: string;
    field?: string;
    year: string;
  }>;
}

export interface GeneratedResume {
  id: string;
  user_id: string;
  job_id: string;
  application_id: string | null;
  version_name: string | null;
  resume_data: string; // JSON string of ResumeSection
  created_at: number;
  updated_at: number;
}

export interface GeneratedResumeWithData extends Omit<GeneratedResume, 'resume_data'> {
  resume_data: ResumeSection; // Parsed JSON
}

export interface GeneratedCoverLetter {
  id: string;
  user_id: string;
  job_id: string;
  application_id: string | null;
  version_name: string | null;
  cover_letter_text: string;
  created_at: number;
  updated_at: number;
}

export interface GeneratedContentResponse {
  analysis: AIAnalysis | null;
  resumes: GeneratedResumeWithData[];
  coverLetters: GeneratedCoverLetter[];
}

export interface CreateGeneratedResumeRequest {
  job_id: string;
}

export interface CreateGeneratedCoverLetterRequest {
  job_id: string;
}

export interface UpdateVersionNameRequest {
  version_name: string;
}
