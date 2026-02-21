import { User } from './user';
import { Job, JobWithSavedStatus } from './job';
import { Application, ApplicationWithJob, AIAnalysis } from './application';

// Auth API
export interface SignupRequest {
  email: string;
  password: string;
}

export interface SignupResponse {
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export interface LogoutResponse {
  success: boolean;
}

export interface MeResponse {
  user: User | null;
}

// Jobs API
export interface GetJobsRequest {
  title?: string;
  remote?: boolean;
  location?: string;
}

export interface GetJobsResponse {
  jobs: Job[];
}

export interface GetJobResponse {
  job: Job;
  saved: boolean;
}

export interface SaveJobResponse {
  success: boolean;
}

export interface UnsaveJobResponse {
  success: boolean;
}

export interface GetSavedJobsResponse {
  jobs: Job[];
}

export interface AnalyzeJobResponse {
  analysis: AIAnalysis;
  cached: boolean;
}

// Applications API
export interface GetApplicationsResponse {
  applications: ApplicationWithJob[];
}

export interface CreateApplicationRequest {
  job_id: string;
  status?: string;
}

export interface CreateApplicationResponse {
  application: Application;
}

export interface UpdateApplicationRequest {
  status?: string;
  notes?: string;
  ai_match_score?: number;
  ai_analysis?: string;
}

export interface UpdateApplicationResponse {
  application: Application;
}

export interface DeleteApplicationResponse {
  success: boolean;
}

// Profile API
export interface GetProfileResponse {
  profile: User;
}

export interface UpdateProfileRequest {
  full_name?: string;
  bio?: string;
  location?: string;
  skills?: string[] | string;
}

export interface UpdateProfileResponse {
  profile: User;
}

// ApplicationUpdate — alias for UpdateApplicationRequest (shared type for update payloads)
export type ApplicationUpdate = UpdateApplicationRequest;

// Error response
export interface ErrorResponse {
  error: string;
}
