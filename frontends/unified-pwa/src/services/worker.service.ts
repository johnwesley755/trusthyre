import apiClient from '../api/apiClient';

export interface Worker {
  id: string;
  name: string;
  profilePhoto: string;
  level: number;
  trustScore: number;
  skills: string[];
  experience: number;
  rating: number;
  distance: number;
  location?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  bio?: string;
  userId?: string;
  email?: string;
  phoneNumber?: string;
  availability: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
  salaryRange: string;
  verificationStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'VERIFIED';
  isOfferSent?: boolean;
  dob?: string | null;
  gender?: string | null;
  whatsappOptIn?: boolean;
  area?: string | null;
  willingToRelocate?: boolean;
  preferredCities?: string[];
  highestEducation?: string | null;
  isPursuingEducation?: boolean;
  collegeName?: string | null;
  degree?: string | null;
  specialization?: string | null;
  schoolMedium?: string | null;
  englishProficiency?: string | null;
  languagesKnown?: string[];
  preferredRoles?: string[];
  resumeUrl?: string | null;
}

export interface WorkerProfileSummary {
  id?: string;
  userId: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  address?: string;
  location?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  bio?: string;
  skills?: string;
  experienceYears?: number;
  level?: string;
  identityVerified?: boolean;
  trustScore?: number;
  rating?: number;
  reliabilityScore?: number;
  performanceScore?: number;
  skillScore?: number;
  isAvailable?: boolean;
  isOfferSent?: boolean;
  offerStatus?: string;
  dob?: string | null;
  gender?: string | null;
  whatsappOptIn?: boolean;
  area?: string | null;
  willingToRelocate?: boolean;
  preferredCities?: string[];
  highestEducation?: string | null;
  isPursuingEducation?: boolean;
  collegeName?: string | null;
  degree?: string | null;
  specialization?: string | null;
  schoolMedium?: string | null;
  englishProficiency?: string | null;
  languagesKnown?: string[];
  preferredRoles?: string[];
  resumeUrl?: string | null;
}

export interface TrustScoreResponse {
  score: number;
  identityVerified: boolean;
  skillsVerifiedCount: number;
  avgRating: number;
  reliabilityRate: number;
  lastUpdated: string;
}

export const workerService = {
  getProfile: () => apiClient.get('/api/worker/me'),
  updateProfile: (data: any) => apiClient.put('/api/worker/profile', data),
  
  searchWorkers: async (params: { 
    latitude?: number; 
    longitude?: number; 
    radius?: number;
    skills?: string;
    minLevel?: number;
  }) => {
    const response = await apiClient.get<any>('/api/search/workers', { params });
    return response.data;
  },

  getWorkerById: async (id: string): Promise<Worker> => {
    const response = await apiClient.get<any>(`/api/worker/${id}`);
    const worker = response.data;

    if (!worker) {
      throw new Error('Worker not found');
    }

    const rawSkills = worker.skills;
    const skillsList = Array.isArray(rawSkills) 
      ? rawSkills 
      : typeof rawSkills === 'string' && rawSkills.trim().length > 0 
        ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

    return {
      id: worker.user_id || worker.userId || worker.id || id,
      userId: worker.user_id || worker.userId || worker.id || id,
      name: worker.full_name || worker.fullName || [worker.first_name || worker.firstName, worker.last_name || worker.lastName].filter(Boolean).join(' ') || 'Specialist Worker',
      profilePhoto: worker.profile_image_url || worker.profileImageUrl || '',
      level: Number(String(worker.level || '1').replace(/\D/g, '')) || 1,
      trustScore: worker.trust_score || worker.trustScore || 70,
      skills: skillsList,
      experience: worker.experience_years || worker.experienceYears || 0,
      rating: worker.rating || (worker.trust_score ? worker.trust_score / 20 : (worker.trustScore ? worker.trustScore / 20 : 4.8)),
      distance: 0,
      location: worker.city || worker.address || worker.location || '',
      address: worker.address,
      city: worker.city,
      latitude: worker.latitude,
      longitude: worker.longitude,
      bio: worker.bio,
      email: worker.email,
      phoneNumber: worker.phone_number || worker.phoneNumber,
      availability: (worker.is_available ?? worker.isAvailable ?? true) ? 'AVAILABLE' : 'BUSY',
      salaryRange: worker.hourly_rate || worker.hourlyRate ? `₹${worker.hourly_rate || worker.hourlyRate}/hr` : '',
      verificationStatus: (worker.identity_verified || worker.identityVerified || worker.isVerified) ? 'VERIFIED' : 'PENDING',
      dob: worker.dob,
      gender: worker.gender,
      whatsappOptIn: worker.whatsapp_opt_in ?? worker.whatsappOptIn,
      area: worker.area,
      willingToRelocate: worker.willing_to_relocate ?? worker.willingToRelocate,
      preferredCities: Array.isArray(worker.preferred_cities) ? worker.preferred_cities : (Array.isArray(worker.preferredCities) ? worker.preferredCities : []),
      highestEducation: worker.highest_education || worker.highestEducation,
      isPursuingEducation: worker.is_pursuing_education ?? worker.isPursuingEducation,
      collegeName: worker.college_name || worker.collegeName,
      degree: worker.degree,
      specialization: worker.specialization,
      schoolMedium: worker.school_medium || worker.schoolMedium,
      englishProficiency: worker.english_proficiency || worker.englishProficiency,
      languagesKnown: Array.isArray(worker.languages_known) ? worker.languages_known : (Array.isArray(worker.languagesKnown) ? worker.languagesKnown : []),
      preferredRoles: Array.isArray(worker.preferred_roles) ? worker.preferred_roles : (Array.isArray(worker.preferredRoles) ? worker.preferredRoles : []),
      resumeUrl: worker.resume_url || worker.resumeUrl,
    };
  },

  getProfilesByUserIds: async (userIds: string[]): Promise<WorkerProfileSummary[]> => {
    const response = await apiClient.post<any>('/api/worker/profiles/by-user-ids', userIds);
    return (response.data || []).map((worker: any) => {
      const fullName = worker.full_name || worker.fullName || [worker.first_name || worker.firstName, worker.last_name || worker.lastName].filter(Boolean).join(' ') || 'Candidate';
      return {
        id: worker.id || worker.user_id || worker.userId,
        userId: worker.user_id || worker.userId || worker.id,
        name: fullName,
        fullName: fullName,
        firstName: worker.first_name || worker.firstName,
        lastName: worker.last_name || worker.lastName,
        email: worker.email,
        phoneNumber: worker.phone_number || worker.phoneNumber,
        profileImageUrl: worker.profile_image_url || worker.profileImageUrl,
        address: worker.address,
        location: worker.location || worker.city || worker.address || '',
        city: worker.city,
        latitude: worker.latitude,
        longitude: worker.longitude,
        bio: worker.bio,
        skills: worker.skills,
        experienceYears: worker.experience_years || worker.experienceYears,
        level: worker.level,
        identityVerified: worker.identity_verified || worker.identityVerified || worker.isVerified,
        trustScore: worker.trust_score || worker.trustScore,
        rating: worker.rating || (worker.trust_score ? worker.trust_score / 20 : (worker.trustScore ? worker.trustScore / 20 : 4.8)),
        reliabilityScore: worker.reliability_score || worker.reliabilityScore,
        performanceScore: worker.performance_score || worker.performanceScore,
        skillScore: worker.skill_score || worker.skillScore,
        isAvailable: worker.is_available || worker.isAvailable,
        isOfferSent: worker.isOfferSent || Boolean(worker.offerStatus),
        offerStatus: worker.offerStatus,
        dob: worker.dob,
        gender: worker.gender,
        whatsappOptIn: worker.whatsapp_opt_in ?? worker.whatsappOptIn,
        area: worker.area,
        willingToRelocate: worker.willing_to_relocate ?? worker.willingToRelocate,
        preferredCities: Array.isArray(worker.preferred_cities) ? worker.preferred_cities : (Array.isArray(worker.preferredCities) ? worker.preferredCities : []),
        highestEducation: worker.highest_education || worker.highestEducation,
        isPursuingEducation: worker.is_pursuing_education ?? worker.isPursuingEducation,
        collegeName: worker.college_name || worker.collegeName,
        degree: worker.degree,
        specialization: worker.specialization,
        schoolMedium: worker.school_medium || worker.schoolMedium,
        englishProficiency: worker.english_proficiency || worker.englishProficiency,
        languagesKnown: Array.isArray(worker.languages_known) ? worker.languages_known : (Array.isArray(worker.languagesKnown) ? worker.languagesKnown : []),
        preferredRoles: Array.isArray(worker.preferred_roles) ? worker.preferred_roles : (Array.isArray(worker.preferredRoles) ? worker.preferredRoles : []),
        resumeUrl: worker.resume_url || worker.resumeUrl,
      };
    });
  },

  incrementProfileView: async (userId: string): Promise<void> => {
    const sessionKey = `profile_viewed_${userId}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      return; // Deduplicate view count per browser session
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(sessionKey, '1');
    }
    await apiClient.post(`/api/worker/profile/${userId}/view`).catch(() => {});
  },

  getTrustScore: async (userId: string): Promise<TrustScoreResponse> => {
    const response = await apiClient.get<any>(`/api/worker/trust-score/${userId}`);
    return response.data || {
      score: 85,
      identityVerified: true,
      skillsVerifiedCount: 3,
      avgRating: 4.8,
      reliabilityRate: 95,
      lastUpdated: new Date().toISOString()
    };
  },

  getWorkerRatings: async (userId: string): Promise<any[]> => {
    const response = await apiClient.get<any>(`/api/ratings/user/${userId}`);
    return response.data || [];
  },

  getScoring: (id: string) => apiClient.get(`/api/worker/scoring/${id}`),
  getLevel: (id: string) => apiClient.get(`/api/worker/level/${id}`),
  completeOnboarding: (data: any) => apiClient.post('/api/worker/complete-onboarding', data),

  // ⚡ Digital Labour Chowk Standby Pool API
  getStandbyPoolWorkers: async (params?: {
    city?: string;
    trade?: string;
    taluk?: string;
    maxWage?: number;
  }): Promise<any[]> => {
    const response = await apiClient.get<any>('/api/worker/standby-pool', { params });
    return response.data || [];
  },

  joinStandbyPool: async (payload: {
    trade: string;
    expectedDailyWage: number;
    taluk: string;
    city?: string;
    shiftPreference?: string;
    notes?: string;
  }): Promise<any> => {
    const response = await apiClient.post<any>('/api/worker/standby-pool', payload);
    return response.data;
  },

  leaveStandbyPool: async (): Promise<any> => {
    const response = await apiClient.delete<any>('/api/worker/standby-pool/me');
    return response.data;
  },
};

