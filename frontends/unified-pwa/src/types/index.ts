export type UserRole = 'WORKER' | 'EMPLOYER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  onboarded: boolean;
  identityVerified: boolean;
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


