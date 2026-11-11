import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Select } from '../../../components/ui/select';

export interface WorkerPreferences {
  skills: string[];
  minHourlyRate: number;
  maxDistanceKm: number;
  preferredCity: string;
  jobTypes: string[];
  availability: 'IMMEDIATE' | 'WEEKENDS_ONLY' | 'PART_TIME' | 'FULL_TIME';
}

const COMMON_SKILLS = [
  'Electrician', 'Plumber', 'Carpenter', 'Welder', 'Mason',
  'Driver', 'HVAC Tech', 'Mechanic', 'Painter', 'Security Guard',
  'Warehouse Executive', 'Cook / Chef', 'Delivery Specialist'
];

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: WorkerPreferences) => void;
  initialPreferences?: Partial<WorkerPreferences>;
}

export const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPreferences
}) => {
  const [preferences, setPreferences] = useState<WorkerPreferences>({
    skills: initialPreferences?.skills || ['Electrician'],
    minHourlyRate: initialPreferences?.minHourlyRate || 300,
    maxDistanceKm: initialPreferences?.maxDistanceKm || 15,
    preferredCity: initialPreferences?.preferredCity || 'Chennai',
    jobTypes: initialPreferences?.jobTypes || ['Full-time', 'Direct Hire'],
    availability: initialPreferences?.availability || 'IMMEDIATE'
  });

  useEffect(() => {
    // Load existing preferences from localStorage if present
    const saved = localStorage.getItem('worker_job_preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const toggleSkill = (skill: string) => {
    setPreferences(prev => {
      const exists = prev.skills.includes(skill);
      return {
        ...prev,
        skills: exists ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill]
      };
    });
  };

  const handleSave = () => {
    localStorage.setItem('worker_job_preferences', JSON.stringify(preferences));
    onSave(preferences);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs font-['Onest',system-ui,sans-serif]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-[#1C1C21] rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-zinc-800 flex justify-between items-center bg-[#F8FAFC]/50 dark:bg-[#121215]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FACD15] text-[#0A1931] flex items-center justify-center">
                <span className="material-symbols-outlined text-lg font-bold">tune</span>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#0A1931] dark:text-zinc-100 font-headline">Job Preferences</h2>
                <p className="text-[11px] text-[#0A1931]/60 dark:text-zinc-400 font-medium">We'll tailor recommended jobs to these criteria</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-neutral-200/60 dark:hover:bg-zinc-800 flex items-center justify-center text-[#0A1931]/60 dark:text-zinc-400 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Preferred Skills */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0A1931] dark:text-zinc-200 flex justify-between">
                <span>Select Your Skills</span>
                <span className="text-[10px] text-[#0A1931]/50 dark:text-zinc-500">{preferences.skills.length} selected</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SKILLS.map(skill => {
                  const isSelected = preferences.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0A1931] dark:bg-[#0066FF] text-[#FACD15] dark:text-white shadow-xs'
                          : 'bg-[#F8FAFC] dark:bg-[#121215] text-[#0A1931]/70 dark:text-zinc-300 hover:bg-neutral-200/70 dark:hover:bg-zinc-800 border border-neutral-200/50 dark:border-zinc-800'
                      }`}
                    >
                      {isSelected && <span className="mr-1">✓</span>}
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expected Hourly Rate */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A1931] dark:text-zinc-200">Expected Min. Hourly Rate</label>
                <span className="text-sm font-extrabold text-[#0A1931] dark:text-[#FACD15] bg-[#FACD15]/20 dark:bg-[#FACD15]/10 px-2 py-0.5 rounded-md">
                  ₹{preferences.minHourlyRate}/hr
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={50}
                value={preferences.minHourlyRate}
                onChange={(e) => setPreferences({ ...preferences, minHourlyRate: Number(e.target.value) })}
                className="w-full accent-[#FACD15] h-1.5 bg-neutral-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-semibold text-neutral-400 dark:text-zinc-500">
                <span>₹100/hr</span>
                <span>₹1,000/hr</span>
                <span>₹2,000/hr</span>
              </div>
            </div>

            {/* Max Travel Distance */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A1931] dark:text-zinc-200">Maximum Travel Radius</label>
                <span className="text-sm font-extrabold text-[#0A1931] dark:text-zinc-100 bg-neutral-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                  {preferences.maxDistanceKm} km
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={50}
                step={1}
                value={preferences.maxDistanceKm}
                onChange={(e) => setPreferences({ ...preferences, maxDistanceKm: Number(e.target.value) })}
                className="w-full accent-[#0A1931] dark:accent-[#0066FF] h-1.5 bg-neutral-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-semibold text-neutral-400 dark:text-zinc-500">
                <span>2 km (Hyperlocal)</span>
                <span>25 km</span>
                <span>50 km (Metro-wide)</span>
              </div>
            </div>

            {/* Preferred City & Availability */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A1931] dark:text-zinc-200">Preferred City</label>
                <input
                  type="text"
                  value={preferences.preferredCity}
                  onChange={(e) => setPreferences({ ...preferences, preferredCity: e.target.value })}
                  placeholder="e.g. Chennai, Mumbai"
                  className="w-full bg-[#F8FAFC] dark:bg-[#121215] border border-neutral-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs font-medium text-[#0A1931] dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#FACD15]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0A1931] dark:text-zinc-200">Availability</label>
                <Select
                  value={preferences.availability}
                  onChange={(e) => setPreferences({ ...preferences, availability: e.target.value as any })}
                  variant="subtle"
                >
                  <option value="IMMEDIATE">Immediate (Today)</option>
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="WEEKENDS_ONLY">Weekends Only</option>
                </Select>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-[#F8FAFC]/50 dark:bg-[#121215]/50 border-t border-neutral-100 dark:border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#0A1931]/70 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-[#FACD15] text-[#0A1931] rounded-lg text-xs font-extrabold uppercase tracking-wider shadow-xs hover:brightness-105 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">check</span>
              Save & Match Jobs
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
