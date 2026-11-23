import { useState, useEffect, useCallback } from 'react';
import { useUser } from '../providers/AuthContext';
import { savedService } from '../services/saved.service';
import { toast } from 'sonner';
import { secureStorage } from '../utils/secureStorage';

export interface SavedJob {
  id: string;
  title: string;
  companyName?: string;
  logoUrl?: string;
  location?: string;
  city?: string;
  salaryText?: string;
  budget?: number;
  jobType?: string;
  experienceText?: string;
  experienceYearsRequired?: number;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  savedAt: string;
}

export interface SavedWorker {
  userId: string;
  name: string;
  profilePhoto?: string;
  profileImageUrl?: string;
  skills: string[];
  city?: string;
  location?: string;
  experience?: number;
  trustScore?: number | string;
  isVerified?: boolean;
  bio?: string;
  savedAt: string;
}

const SAVED_JOBS_KEY_PREFIX = 'trusthire_saved_jobs_';
const SAVED_WORKERS_KEY_PREFIX = 'trusthire_saved_workers_';
const SYNC_EVENT_NAME = 'trusthire_saved_sync_event';

const serverSyncMap = new Map<string, boolean>();

interface UseSavedStoreOptions {
  lazy?: boolean;
}

export const useSavedStore = (options?: UseSavedStoreOptions) => {
  const { user } = useUser();
  const userId = user?.id || 'guest';
  const isLoggedIn = !!user?.id;

  const getJobsStorageKey = () => `${SAVED_JOBS_KEY_PREFIX}${userId}`;
  const getWorkersStorageKey = () => `${SAVED_WORKERS_KEY_PREFIX}${userId}`;

  const loadSavedJobs = useCallback((): SavedJob[] => {
    try {
      const data = secureStorage.getItem(getJobsStorageKey());
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, [userId]);

  const loadSavedWorkers = useCallback((): SavedWorker[] => {
    try {
      const data = secureStorage.getItem(getWorkersStorageKey());
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }, [userId]);

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>(loadSavedJobs);
  const [savedWorkers, setSavedWorkers] = useState<SavedWorker[]>(loadSavedWorkers);
  const [isLoading, setIsLoading] = useState(false);

  // Sync from DB once per session when user is logged in (skipped in lazy mode)
  useEffect(() => {
    if (options?.lazy) return;
    let isMounted = true;

    const fetchServerData = async () => {
      if (!isLoggedIn || serverSyncMap.get(userId)) return;
      try {
        setIsLoading(true);
        serverSyncMap.set(userId, true);
        if (user.role === 'EMPLOYER') {
          const serverWorkers = await savedService.getSavedWorkers();
          if (isMounted && Array.isArray(serverWorkers)) {
            setSavedWorkers(serverWorkers);
            secureStorage.setItem(getWorkersStorageKey(), JSON.stringify(serverWorkers));
          }
        } else {
          const serverJobs = await savedService.getSavedJobs();
          if (isMounted && Array.isArray(serverJobs)) {
            setSavedJobs(serverJobs);
            secureStorage.setItem(getJobsStorageKey(), JSON.stringify(serverJobs));
          }
        }
      } catch (err) {
        console.warn('Failed to load saved items from database, using cached local data', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchServerData();

    return () => {
      isMounted = false;
    };
  }, [userId, isLoggedIn, user?.role]);

  // Sync state on local storage or window event
  useEffect(() => {
    setSavedJobs(loadSavedJobs());
    setSavedWorkers(loadSavedWorkers());

    const handleSync = () => {
      setSavedJobs(loadSavedJobs());
      setSavedWorkers(loadSavedWorkers());
    };

    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [userId, loadSavedJobs, loadSavedWorkers]);

  const notifyChange = () => {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
  };

  // Job Bookmark Actions
  const isJobSaved = useCallback((jobId: string) => {
    return savedJobs.some((j) => j.id === jobId);
  }, [savedJobs]);

  const toggleSaveJob = useCallback((job: Partial<SavedJob> & { id: string; title: string }) => {
    const current = loadSavedJobs();
    const exists = current.some((j) => j.id === job.id);

    let updated: SavedJob[];
    if (exists) {
      updated = current.filter((j) => j.id !== job.id);
      toast.info('Job removed from your Saved Jobs');
      if (isLoggedIn) {
        savedService.removeSavedJob(job.id).catch((e) => console.error('Failed to remove saved job from DB', e));
      }
    } else {
      const newJob: SavedJob = {
        id: job.id,
        title: job.title,
        companyName: job.companyName || 'Verified Employer',
        logoUrl: job.logoUrl,
        location: job.location || job.city || 'Remote / Local Area',
        city: job.city,
        salaryText: job.salaryText,
        budget: job.budget,
        jobType: job.jobType || 'Full-Time',
        experienceText: job.experienceText,
        experienceYearsRequired: job.experienceYearsRequired,
        status: job.status,
        createdAt: job.createdAt,
        expiresAt: job.expiresAt,
        savedAt: new Date().toISOString(),
      };
      updated = [newJob, ...current];
      toast.success('Job saved to your Saved Jobs!');
      if (isLoggedIn) {
        savedService.saveJob(job.id).catch((e) => console.error('Failed to save job to DB', e));
      }
    }

    try {
      secureStorage.setItem(getJobsStorageKey(), JSON.stringify(updated));
      setSavedJobs(updated);
      notifyChange();
    } catch (e) {
      console.error('Failed to save job to local storage', e);
    }
    return !exists;
  }, [userId, isLoggedIn]);

  const removeSavedJob = useCallback((jobId: string) => {
    const current = loadSavedJobs();
    const updated = current.filter((j) => j.id !== jobId);
    secureStorage.setItem(getJobsStorageKey(), JSON.stringify(updated));
    setSavedJobs(updated);
    notifyChange();
    toast.info('Job removed from Saved Jobs');
    if (isLoggedIn) {
      savedService.removeSavedJob(jobId).catch((e) => console.error('Failed to delete saved job from DB', e));
    }
  }, [userId, isLoggedIn]);

  // Worker Profile Bookmark Actions
  const isWorkerSaved = useCallback((workerId: string) => {
    return savedWorkers.some((w) => w.userId === workerId);
  }, [savedWorkers]);

  const toggleSaveWorker = useCallback((worker: Partial<SavedWorker> & { userId: string; name: string }) => {
    const current = loadSavedWorkers();
    const exists = current.some((w) => w.userId === worker.userId);

    let updated: SavedWorker[];
    if (exists) {
      updated = current.filter((w) => w.userId !== worker.userId);
      toast.info('Worker profile removed from Saved Profiles');
      if (isLoggedIn) {
        savedService.removeSavedWorker(worker.userId).catch((e) => console.error('Failed to delete saved worker from DB', e));
      }
    } else {
      const newWorker: SavedWorker = {
        userId: worker.userId,
        name: worker.name,
        profilePhoto: worker.profilePhoto || worker.profileImageUrl,
        profileImageUrl: worker.profileImageUrl || worker.profilePhoto,
        skills: worker.skills || [],
        city: worker.city || worker.location || 'Local Area',
        location: worker.location || worker.city || 'Local Area',
        experience: worker.experience || 0,
        trustScore: worker.trustScore,
        isVerified: worker.isVerified ?? false,
        bio: worker.bio,
        savedAt: new Date().toISOString(),
      };
      updated = [newWorker, ...current];
      toast.success('Worker profile saved to your Saved Profiles!');
      if (isLoggedIn) {
        savedService.saveWorker(worker.userId).catch((e) => console.error('Failed to save worker profile to DB', e));
      }
    }

    try {
      secureStorage.setItem(getWorkersStorageKey(), JSON.stringify(updated));
      setSavedWorkers(updated);
      notifyChange();
    } catch (e) {
      console.error('Failed to save worker to local storage', e);
    }
    return !exists;
  }, [userId, isLoggedIn]);

  const removeSavedWorker = useCallback((workerId: string) => {
    const current = loadSavedWorkers();
    const updated = current.filter((w) => w.userId !== workerId);
    secureStorage.setItem(getWorkersStorageKey(), JSON.stringify(updated));
    setSavedWorkers(updated);
    notifyChange();
    toast.info('Worker profile removed from Saved Profiles');
    if (isLoggedIn) {
      savedService.removeSavedWorker(workerId).catch((e) => console.error('Failed to delete saved worker from DB', e));
    }
  }, [userId, isLoggedIn]);

  const syncSavedStatusFromList = useCallback((workers: any[]) => {
    if (!Array.isArray(workers) || workers.length === 0) return;
    const current = loadSavedWorkers();
    let changed = false;
    const updated = [...current];

    workers.forEach((w) => {
      const wid = w.userId || w.id;
      if (!wid) return;
      const existsIndex = updated.findIndex((sw) => sw.userId === wid || (sw as any).id === wid);

      if (w.isSaved && existsIndex === -1) {
        updated.push({
          userId: wid,
          name: w.name || 'Candidate',
          profilePhoto: w.profileImageUrl || w.profilePhoto || '',
          profileImageUrl: w.profileImageUrl || w.profilePhoto || '',
          skills: Array.isArray(w.skills) ? w.skills : (typeof w.skills === 'string' ? w.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
          city: w.city || w.location || 'Local Area',
          location: w.location || w.city || 'Local Area',
          experience: w.experienceYears ?? w.experience ?? 0,
          trustScore: w.trustScore ? `${w.trustScore}%` : undefined,
          isVerified: w.isVerified ?? false,
          bio: w.bio,
          savedAt: new Date().toISOString(),
        });
        changed = true;
      } else if (existsIndex !== -1) {
        const existing = updated[existsIndex];
        if ((!existing.name || existing.name === 'Specialist Candidate' || existing.name === 'Specialist') && w.name && w.name !== 'Specialist Candidate') {
          existing.name = w.name;
          changed = true;
        }
        if (w.experienceYears !== undefined && existing.experience !== w.experienceYears) {
          existing.experience = w.experienceYears;
          changed = true;
        }
      }
    });

    if (changed) {
      try {
        secureStorage.setItem(getWorkersStorageKey(), JSON.stringify(updated));
        setSavedWorkers(updated);
        notifyChange();
      } catch (e) {
        console.error('Failed to sync saved workers to local storage', e);
      }
    }
  }, [userId, loadSavedWorkers]);

  return {
    savedJobs,
    savedWorkers,
    isLoading,
    isJobSaved,
    toggleSaveJob,
    removeSavedJob,
    isWorkerSaved,
    toggleSaveWorker,
    removeSavedWorker,
    syncSavedStatusFromList,
  };
};
