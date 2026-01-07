export interface User {
  id: string;
  email: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  skills: string | null; // JSON string: ["React", "TypeScript"]
  avatar_url: string | null;
  address: string | null;
  linkedin_url: string | null;
  role?: 'user' | 'admin';
  membership_tier?: 'trial' | 'paid';
  membership_started_at?: number;
  membership_expires_at?: number;
  trial_started_at?: number;
  // Subscription tier system
  subscription_tier?: 'free' | 'pro';
  subscription_status?: 'active' | 'canceled' | 'expired';
  subscription_started_at?: number;
  subscription_expires_at?: number;
  polar_customer_id?: string;
  polar_subscription_id?: string;
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
