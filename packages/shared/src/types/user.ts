export interface User {
  id: string;
  email: string;

  // NEW: Structured name fields (replaces full_name)
  first_name: string | null;
  last_name: string | null;

  // NEW: Phone number
  phone: string | null;

  // NEW: Structured address fields (replaces address)
  street_address: string | null;
  city: string | null;
  state: string | null; // 2-letter state code (US)
  zip_code: string | null;

  // DEPRECATED: Keep for backward compatibility, will be removed in future version
  full_name?: string | null;  // Computed: first_name + ' ' + last_name
  address?: string | null;     // Computed from structured address fields

  // Profile fields
  bio: string | null;
  location: string | null; // Job search location preference (can differ from home address)
  skills: string | null; // JSON string: ["React", "TypeScript"]
  avatar_url: string | null;
  linkedin_url: string | null;
  role?: 'user' | 'admin';

  // Membership & Trial
  membership_tier?: 'trial' | 'paid';
  membership_started_at?: number;
  membership_expires_at?: number;
  trial_started_at?: number;
  trial_expires_at?: number;
  is_trial?: number; // 0 or 1 (SQLite boolean)

  // Subscription tier system (Polar)
  subscription_tier?: 'free' | 'pro';
  subscription_status?: 'active' | 'canceled' | 'expired';
  subscription_started_at?: number;
  subscription_expires_at?: number;
  polar_customer_id?: string;
  polar_subscription_id?: string;

  // Timestamps
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
