export interface ParsedResume {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  workExperience: Array<{
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  education: Array<{
    school: string;
    degree?: string;
    fieldOfStudy?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  skills?: string[];
}
