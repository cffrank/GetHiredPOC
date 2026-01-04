export interface User {
  id: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  skills: string | null; // JSON string: ["React", "TypeScript"]
  avatar_url: string | null;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}

export interface UserWithSkills extends Omit<User, 'skills'> {
  skills: string[];
}
