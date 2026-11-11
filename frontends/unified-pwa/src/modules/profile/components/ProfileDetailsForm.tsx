import React, { useState } from 'react';
import { Loader2, Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { ProfileLocationPicker } from './ProfileLocationPicker';

interface ProfileDetailsFormProps {
  form: {
    fullName: string;
    bio: string;
    skills: string;
    experienceYears: string;
    hourlyRate: string;
    address: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  setForm: (form: any) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const ProfileDetailsForm: React.FC<ProfileDetailsFormProps> = ({
  form,
  setForm,
  onSave,
  isSaving,
}) => {
  const [showMap, setShowMap] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <section className="bg-white rounded-[2rem] p-8 lg:p-10 shadow-sm border border-[#0A1931]/5">
      <h3 className="text-xl font-black text-[#0A1931] dark:text-white mb-8 flex items-center gap-4">
        <span className="w-2.5 h-7 bg-[#FACD15] rounded-full shadow-[0_0_15px_rgba(250,205,21,0.5)]"></span>
        Application
      </h3>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/40 ml-1 tracking-widest">Full Name</label>
            <input 
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full bg-[#F8FAFC] border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#FACD15]/50 text-[#0A1931] dark:text-white font-bold text-sm transition-all shadow-inner" 
              type="text" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/40 ml-1 tracking-widest">Operating City</label>
            <input 
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full bg-[#F8FAFC] border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#FACD15]/50 text-[#0A1931] dark:text-white font-bold text-sm transition-all shadow-inner" 
              type="text" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/40 ml-1 tracking-widest">Work Experience (Years)</label>
            <input 
              name="experienceYears"
              value={form.experienceYears}
              onChange={handleChange}
              className="w-full bg-[#F8FAFC] border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#FACD15]/50 text-[#0A1931] dark:text-white font-bold text-sm transition-all shadow-inner" 
              type="number" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/40 ml-1 tracking-widest">Hourly Rate (₹)</label>
            <input 
              name="hourlyRate"
              value={form.hourlyRate}
              onChange={handleChange}
              className="w-full bg-[#F8FAFC] border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#FACD15]/50 text-[#0A1931] dark:text-white font-bold text-sm transition-all shadow-inner" 
              type="number" 
            />
          </div>
          <div className="md:col-span-2 space-y-4">
            <div className="flex justify-between items-end px-1">
              <label className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/40 tracking-widest">Residential Address</label>
              <button 
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#0A1931] dark:text-white hover:text-[#FACD15] transition-colors"
              >
                <MapIcon className="w-3.5 h-3.5" />
                {showMap ? "Hide Map" : "Open Map Picker"}
                {showMap ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            
            <input 
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Detect via map or enter manually..."
              className="w-full bg-[#F8FAFC] border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#FACD15]/50 text-[#0A1931] dark:text-white font-bold text-sm transition-all shadow-inner" 
              type="text" 
            />

            {showMap && (
              <div className="pt-2">
                <ProfileLocationPicker 
                  initialPos={form.latitude && form.longitude ? { lat: form.latitude, lon: form.longitude } : undefined}
                  onLocationSelect={(lat, lon, addr, city) => {
                    setForm((prev: any) => ({
                      ...prev,
                      address: addr,
                      city: city,
                      latitude: lat,
                      longitude: lon
                    }));
                  }}
                />
              </div>
            )}
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/40 ml-1 tracking-widest">Skills Matrix (Comma Separated)</label>
            <input 
              name="skills"
              value={form.skills}
              onChange={handleChange}
              placeholder="Electrical, HVAC, Plumbing..."
              className="w-full bg-[#F8FAFC] border-none rounded-2xl px-5 py-3.5 focus:ring-2 focus:ring-[#FACD15]/50 text-[#0A1931] dark:text-white font-bold text-sm transition-all shadow-inner" 
              type="text" 
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/40 ml-1 tracking-widest">Professional Bio</label>
            <textarea 
              name="bio"
              value={form.bio}
              onChange={handleChange}
              className="w-full bg-[#F8FAFC] border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-[#FACD15]/50 text-[#0A1931] dark:text-white font-medium text-sm transition-all shadow-inner resize-none min-h-[120px]" 
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="group flex items-center gap-3 px-10 py-4 bg-[#FACD15] text-[#0A1931] dark:text-white rounded-2xl font-black uppercase text-xs tracking-[0.1em] shadow-xl hover:shadow-[0_10px_30px_rgba(250,205,21,0.3)] transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#0A1931] dark:text-white" />
            ) : (
              <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">save</span>
            )}
            {isSaving ? "Synchronizing..." : "Update Profile"}
          </button>
        </div>
      </div>
    </section>
  );
};
