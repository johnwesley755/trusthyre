import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Camera, Loader2, Check, ShieldCheck, Zap } from 'lucide-react';

interface ProfileHeroCardProps {
  user: any;
  profile: any;
  isUploadingImage: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEditingLocation: boolean;
  setIsEditingLocation: (isEditing: boolean) => void;
  locationInput: string;
  setLocationInput: (input: string) => void;
  onUpdateLocation: () => void;
  useCurrentLocation: () => void;
}

export const ProfileHeroCard: React.FC<ProfileHeroCardProps> = ({
  user,
  profile,
  isUploadingImage,
  onImageUpload,
  isEditingLocation,
  setIsEditingLocation,
  locationInput,
  setLocationInput,
  onUpdateLocation,
  useCurrentLocation,
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-zinc-800/80 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#0066FF]/5 rounded-bl-full pointer-events-none" />
      
      <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start relative z-10">
        <div className="relative group/photo cursor-pointer shrink-0">
          <input 
            type="file" 
            accept="image/*" 
            onChange={onImageUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            title="Update Profile Image"
          />
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-slate-100 shadow-md relative group-hover/photo:scale-105 transition-all bg-[#0A1931] flex items-center justify-center">
            {user?.profileImageUrl || user?.profile_image_url ? (
              <img 
                src={user.profileImageUrl || user.profile_image_url} 
                alt={user.first_name || user.firstName || "Profile"} 
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-opacity ${isUploadingImage ? 'opacity-50' : ''}`}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-[#0066FF] text-white flex items-center justify-center text-4xl font-extrabold">
                {(user?.first_name || user?.firstName || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-[#0A1931]/50 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity backdrop-blur-xs">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>

          {isUploadingImage && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs rounded-2xl flex items-center justify-center z-20">
              <Loader2 className="w-7 h-7 text-[#0066FF] animate-spin" />
            </div>
          )}

          {user?.identity_verified && (
            <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-md z-40">
              <Check className="w-4 h-4 font-bold" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A1931] dark:text-white tracking-tight">
              {profile?.fullName || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
            </h2>
            <div className="flex items-center justify-center md:justify-start gap-2.5 mt-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Partner
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                {profile?.level && !profile.level.startsWith('L') ? profile.level : 'Verified Professional'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-start gap-3 pt-1">
            <AnimatePresence mode="wait">
              {isEditingLocation ? (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex flex-wrap items-center gap-2 justify-center md:justify-start"
                >
                  <input 
                    type="text" 
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Enter city / location..."
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#0066FF] outline-none"
                  />
                  <button 
                    onClick={onUpdateLocation}
                    className="px-3 py-1.5 bg-[#0066FF] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    Save
                  </button>
                  <button 
                    onClick={useCurrentLocation}
                    className="p-1.5 bg-slate-100 text-slate-700 dark:text-zinc-300 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                    title="Use Current GPS Location"
                  >
                    <Navigation className="w-4 h-4 text-[#0066FF]" />
                  </button>
                  <button 
                    onClick={() => setIsEditingLocation(false)}
                    className="px-2.5 py-1.5 text-xs text-slate-500 font-bold hover:text-slate-700 dark:text-zinc-300"
                  >
                    Cancel
                  </button>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#0066FF]" />
                  <span>{profile?.location || profile?.city || 'Location not specified'}</span>
                  <button 
                    onClick={() => {
                      setLocationInput(profile?.location || profile?.city || '');
                      setIsEditingLocation(true);
                    }}
                    className="text-[#0066FF] font-bold hover:underline ml-1 cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
