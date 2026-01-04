// User types
export type { User, Session, UserWithSkills } from './types/user';

// Job types
export type {
  Job,
  SavedJob,
  JobWithRequirements,
  JobWithSavedStatus
} from './types/job';

// Application types
export type {
  Application,
  ApplicationStatus,
  ApplicationWithJob,
  AIAnalysis,
  ApplicationWithAnalysis,
} from './types/application';

// API types
export type {
  // Auth
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  // Jobs
  GetJobsRequest,
  GetJobsResponse,
  GetJobResponse,
  SaveJobResponse,
  UnsaveJobResponse,
  GetSavedJobsResponse,
  AnalyzeJobResponse,
  // Applications
  GetApplicationsResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  UpdateApplicationRequest,
  UpdateApplicationResponse,
  DeleteApplicationResponse,
  // Profile
  GetProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  // Error
  ErrorResponse,
} from './types/api';
