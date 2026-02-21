export interface JobMatch {
  jobId: string;
  score: number; // 0-100
  strengths: string[];
  concerns: string[];
  recommendation: 'strong' | 'good' | 'fair' | 'weak';
}
