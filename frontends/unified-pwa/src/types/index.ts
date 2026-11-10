export type UserRole = 'WORKER' | 'EMPLOYER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  onboarded: boolean;
  identityVerified: boolean;
  name?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  companyName?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
  // Compatibility fields
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  identity_verified?: boolean;
  email_verified?: boolean;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  fullName: string;
  skills: string[];
  experienceYears: number;
  hourlyRate: number;
  location: string;
  latitude?: number;
  longitude?: number;
  bio?: string;
  trustScore: number;
  level: string;
  levelNumber: number;
  levelScore: number;
  reliabilityScore: number;
  skillScore: number;
  performanceScore: number;
  isAvailable: boolean;
  totalJobs: number;
  completedJobs: number;
  abscondCount: number;
  profileViews: number;
  profileImageUrl?: string;
}

export interface EmployerProfile {
  id: string;
  userId: string;
  companyName: string;
  companyWebsite?: string;
  industry: string;
  businessTier: string;
  location: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  profileBio?: string;
  isVerified: boolean;
}

export interface Job {
  id: string;
  employerId: string;
  employerName?: string;
  title: string;
  description: string;
  industry: string;
  requiredSkills: string[];
  experienceYearsRequired: number;
  budget: number;
  dailyRate?: number | null;
  location: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  status: 'OPEN' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'CLOSED';
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  applicationCount?: number;
  applicantCount?: number;
  isExternal?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  alternateSources?: Array<{ sourceName: string; sourceUrl: string; dateSeen?: string }>;
  datePosted?: string;
  jobType?: string;
  coverImageUrl?: string | null;
  cover_image_url?: string | null;
  perks?: string[];
  nearestMetroStation?: string | null;
  nearest_metro_station?: string | null;
  nearestBusStand?: string | null;
  nearest_bus_stand?: string | null;
  companyTransportProvided?: boolean;
  company_transport_provided?: boolean;
  walkingMinutesToTransit?: number;
  walking_minutes_to_transit?: number;
  landmark?: string | null;
  allowDirectCall?: boolean;
  allowDirectWhatsapp?: boolean;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  isUrgentSpotHire?: boolean;
  isWalkInInterview?: boolean;
  walkInDetails?: {
    isWalkIn?: boolean;
    dates?: string;
    timing?: string;
    venueAddress?: string;
    contactPerson?: string;
    landmark?: string;
  } | null;
  equipmentRequired?: string[];
  additionalDetails?: Record<string, any>;
  additional_details?: Record<string, any>;
  employerProfile?: {
    id?: string;
    companyName: string;
    businessTier?: string;
    isVerified?: boolean;
    city?: string;
    logoUrl?: string;
  } | null;
}

export interface JobApplication {
  id: string;
  jobId: string;
  workerId: string;
  status: 'APPLIED' | 'PENDING' | 'OFFER_SENT' | 'REVIEWING' | 'SHORTLISTED' | 'ACCEPTED' | 'APPROVED' | 'REJECTED' | 'DECLINED' | 'COMPLETED';
  appliedAt: string;
  coverLetter?: string;
  transitModePreferred?: string;
  transit_mode_preferred?: string;
  job?: Job;
  worker?: WorkerProfile;
  workerName?: string;
  workerSkills?: string[];
  workerTrustScore?: number;
  workerProfileImageUrl?: string;
}

export interface SkillTestQuestion {
  id: string;
  testId?: string;
  questionText: string;
  options: string[];
  correctOption?: number;
  points?: number;
}

export interface SkillTest {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  durationMinutes: number;
  points: number;
  questionsCount?: number;
  skillTestQuestions?: SkillTestQuestion[];
  questions?: SkillTestQuestion[];
}

export interface SkillTestResult {
  id: string;
  testId: string;
  workerId: string;
  score: number;
  passed: boolean;
  completedAt?: string;
  skillTest?: SkillTest;
  feedback?: string;
  correctAnswers?: number;
  totalQuestions?: number;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  user_id?: string;
  title: string;
  message: string;
  link?: string | null;
  type?: string;
  isRead: boolean;
  is_read?: boolean;
  createdAt: string;
  created_at?: string;
}

export interface Rating {
  id: string;
  reviewerId: string;
  rateeId: string;
  jobId: string;
  score: number;
  comment?: string;
  createdAt: string;
  reviewerName?: string;
  reviewerAvatar?: string;
  jobTitle?: string;
}

export interface UserSettings {
  userId: string;
  theme?: string;
  language?: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  docImageUrl?: string;
  liveImageUrl?: string;
  confidenceScore?: string;
  failureReason?: string;
  createdAt?: string;
}

export interface EmployerStats {
  activeJobs: number;
  totalApplicants: number;
  interviewingCount: number;
  totalHired: number;
  unreadNotifications: number;
}

export interface WorkerStats {
  appliedJobs: number;
  unreadNotifications: number;
  level?: string;
  trustScore?: number;
}

export interface JobSearch extends Job {
  distance?: number;
  matchScore?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}


