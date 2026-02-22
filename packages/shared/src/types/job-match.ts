export interface QualificationMatch {
  requirement: string;
  matched: boolean;
  evidence: string;
}

export interface ResumeTip {
  suggestion: string;
  example: string;
}

export interface JobMatch {
  jobId: string;
  score: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendation: 'strong' | 'good' | 'fair' | 'weak';
  summary?: string;
  qualifications?: QualificationMatch[];
  resumeTips?: ResumeTip[];
}
