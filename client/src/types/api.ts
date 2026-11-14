// Types mirroring backend DTOs. Keep in sync with server/src/modules/*.

export type Role = 'super_admin' | 'cc' | 'assistant';
export type UserStatus = 'pending' | 'approved' | 'suspended';

export type University = {
  id: string;
  name: string;
  shortCode: string;
  matriculePrefix: string;
};

export type AuthUser = {
  id: string;
  universityId: string;
  fullName: string;
  matricule: string;
  email: string;
  department: string;
  level: string;
  role: Role;
  status: UserStatus;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type RegisterResponse = {
  message: string;
  user: {
    id: string;
    fullName: string;
    matricule: string;
    email: string;
    universityId: string;
    department: string;
    level: string;
    role: Role;
    status: UserStatus;
  };
};

export type HallLiveStatus = 'FREE' | 'OCCUPIED' | 'BOOKED_SOON';

export type Hall = {
  id: string;
  universityId: string;
  name: string;
  zone: string;
  capacityTier: 'small' | 'medium' | 'large' | 'amphi';
  approxCapacityRange: string;
  status: 'approved' | 'pending' | 'rejected';
  submittedBy: string | null;
  liveStatus: HallLiveStatus;
  activeBookingId: string | null;
  createdAt: string;
};

export type Booking = {
  id: string;
  universityId: string;
  hallId: string;
  hallName: string;
  userId: string;
  courseCode: string;
  studentCount: number;
  bookingType: 'instant' | 'scheduled';
  isCheckedIn: boolean;
  startTime: string;
  endTime: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
};

export type ApiError = {
  error: string;
  code?: string;
};

export type ValidationError = {
  error: string;
  code: 'VALIDATION';
  // The server sends a formatted string in `error`; issues are embedded.
  issues?: { path: string; message: string }[];
};