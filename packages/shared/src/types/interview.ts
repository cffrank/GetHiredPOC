// Interview Questions Types
// For storing and managing interview preparation questions

export interface InterviewQuestion {
  id: string;
  user_id: string;
  application_id: string | null;  // NULL if general prep, linked if specific to application
  job_id: string | null;          // For easy filtering by job
  question: string;
  answer: string | null;           // NULL if user hasn't answered yet
  is_behavioral: number;           // 0=technical, 1=behavioral (SQLite boolean)
  difficulty: 'easy' | 'medium' | 'hard' | null;
  notes: string | null;            // Additional notes or context
  created_at: number;
  updated_at: number;
}

export interface CreateInterviewQuestionRequest {
  question: string;
  answer?: string;
  application_id?: string;
  job_id?: string;
  is_behavioral?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  notes?: string;
}

export interface UpdateInterviewQuestionRequest {
  question?: string;
  answer?: string;
  is_behavioral?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  notes?: string;
}

export interface InterviewQuestionsListResponse {
  questions: InterviewQuestion[];
  total: number;
}

// Helper type for frontend display
export interface InterviewQuestionWithJob extends InterviewQuestion {
  job_title?: string;
  company_name?: string;
}
