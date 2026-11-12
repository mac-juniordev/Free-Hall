/**
 * Shared DB-shape types. Frontend models are separate — these mirror the SQL
 * table columns we actually read.
 */

export type University = {
  id: string;
  name: string;
  short_code: string;
  matricule_prefix: string;
  is_active: boolean;
  created_at: string;
};

export type User = {
  id: string;
  university_id: string;
  full_name: string;
  matricule: string;
  email: string;
  department: string;
  level: string;
  role: 'super_admin' | 'cc' | 'assistant';
  status: 'pending' | 'approved' | 'suspended';
  created_at: string;
};

export type Hall = {
  id: string;
  university_id: string;
  name: string;
  zone: string;
  capacity_tier: 'small' | 'medium' | 'large' | 'amphi';
  approx_capacity_range: string;
  status: 'approved' | 'pending' | 'rejected';
  submitted_by: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  university_id: string;
  hall_id: string;
  user_id: string;
  course_code: string;
  student_count: number;
  booking_type: 'instant' | 'scheduled';
  is_checked_in: boolean;
  start_time: string;
  end_time: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  created_at: string;
};

export type SwapRequest = {
  id: string;
  university_id: string;
  requester_booking_id: string;
  target_booking_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
};

export type SystemSetting = {
  id: string;
  university_id: string;
  setting_key: string;
  is_enabled: boolean;
  scheduled_date: string | null;
  announcement_text: string | null;
  updated_at: string;
};

export type Sponsor = {
  id: string;
  university_id: string;
  business_name: string;
  banner_text: string;
  whatsapp_footer: string;
  contact_phone: string | null;
  expires_at: string;
  is_active: boolean;
  created_at: string;
};