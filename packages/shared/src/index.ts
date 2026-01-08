// User types
export type { User, Session, UserWithSkills } from './types/user';

// Preferences types
export type { JobSearchPreferences } from './types/preferences';
export { INDUSTRIES, EMPLOYMENT_STATUS_LABELS, WORK_MODE_LABELS } from './types/preferences';

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
  // Generated content types
  ResumeSection,
  GeneratedResume,
  GeneratedResumeWithData,
  GeneratedCoverLetter,
  GeneratedContentResponse,
  CreateGeneratedResumeRequest,
  CreateGeneratedCoverLetterRequest,
  UpdateVersionNameRequest,
} from './types/application';

// Chat types
export type {
  ChatMessage,
  ChatConversation,
  ChatConversationWithMessages,
  ToolCall,
  ToolResult,
  SendChatMessageRequest,
  SendChatMessageResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  // Navigation and filtering
  NavigationAction,
  JobFilters,
} from './types/chat';

// Interview Question types
export type {
  InterviewQuestion,
  CreateInterviewQuestionRequest,
  UpdateInterviewQuestionRequest,
  InterviewQuestionsListResponse,
  InterviewQuestionWithJob,
} from './types/interview';

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
