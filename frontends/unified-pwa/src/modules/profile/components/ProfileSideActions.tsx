import React from 'react';
import { Link } from 'react-router-dom';

interface ProfileSideActionsProps {
  onLogout: () => void;
  user: any;
}

export const ProfileSideActions: React.FC<ProfileSideActionsProps> = ({ onLogout, user }) => {
  const isVerified = user?.identity_verified === true;

  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <div className="bg-white dark:bg-[#09090B] rounded-[2rem] p-8 shadow-sm border border-[#0A1931]/5 dark:border-zinc-800 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#FACD15] opacity-[0.05] rounded-full blur-xl" />
        <h4 className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/30 mb-8 tracking-[0.2em] relative z-10">Profile Card</h4>
        <div className="space-y-3 relative z-10">
          <button className="w-full py-4.5 bg-[#FACD15] text-[#0A1931] dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg hover:shadow-[0_10px_20px_rgba(250,205,21,0.2)] active:scale-95 transition-all">
            <span className="material-symbols-outlined text-lg">verified_user</span>
            Certification Vault
          </button>
          <Link 
            to="/settings"
            className="w-full py-4.5 bg-white dark:bg-[#121215] border-2 border-[#0A1931]/5 dark:border-zinc-800 text-[#0A1931] dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:border-[#FACD15] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            Settings
          </Link>
          <button 
            onClick={onLogout}
            className="w-full py-4.5 bg-[#F8FAFC] text-[#0A1931] dark:text-white/60 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-[#E9E8E3] hover:text-[#0A1931] dark:text-white active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Terminate Session
          </button>
        </div>
      </div>

      {/* Verification Badge Card */}
      {isVerified ? (
        <div className="bg-[#FACD15]/10 rounded-[2rem] p-8 border-2 border-[#FACD15] border-dashed group hover:border-solid transition-all duration-500">
          <div className="flex items-center gap-5 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#FACD15] flex items-center justify-center text-[#0A1931] dark:text-white shadow-lg group-hover:rotate-6 transition-transform">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            </div>
            <div>
              <h4 className="font-black text-[#0A1931] dark:text-white text-lg tracking-tight leading-none">Verified Identity</h4>
              <p className="text-[10px] text-[#0A1931] dark:text-white/50 font-black uppercase tracking-widest mt-1">Compliance Audited</p>
            </div>
          </div>
          <p className="text-sm text-[#0A1931] dark:text-white/80 font-medium leading-relaxed mb-6">
            This profile has been manually audited by the TrustHire compliance team. All certifications are currently active and verified.
          </p>
          <button className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white underline decoration-[#FACD15] decoration-4 underline-offset-8 hover:decoration-[#0A1931] transition-all">
            Review Audit Log
          </button>
        </div>
      ) : (
        <div className="bg-amber-50 rounded-[2rem] p-8 border-2 border-amber-300 border-dashed group hover:border-solid transition-all duration-500">
          <div className="flex items-center gap-5 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center text-white shadow-lg group-hover:rotate-6 transition-transform">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>gpp_maybe</span>
            </div>
            <div>
              <h4 className="font-black text-amber-800 text-lg tracking-tight leading-none">Unverified Profile</h4>
              <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">Verification Required</p>
            </div>
          </div>
          <p className="text-sm text-amber-700 font-medium leading-relaxed mb-6">
            Your identity has not been verified yet. Complete the identity verification steps to get verified and unlocked for top jobs.
          </p>
          <Link 
            to="/verify-identity" 
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-amber-800 underline decoration-amber-400 decoration-4 underline-offset-8 hover:decoration-amber-800 transition-all"
          >
            Verify Identity Now <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </Link>
        </div>
      )}

      {/* Recent Activity */}
      <div className="p-4 px-8">
        <h4 className="text-[10px] font-black uppercase text-[#0A1931] dark:text-white/30 mb-8 tracking-[0.2em]">Recent Activity</h4>
        <div className="space-y-8 relative">
          <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-[#0A1931]/10" />
          
          <div className="flex gap-6 relative">
            <div className="w-2 h-2 rounded-full bg-[#FACD15] mt-1.5 shrink-0 shadow-[0_0_10px_rgba(250,205,21,1)]" />
            <div>
              <p className="text-sm font-black text-[#0A1931] dark:text-white">Profile Synchronized</p>
              <p className="text-[10px] text-[#0A1931] dark:text-white/40 font-bold uppercase mt-0.5">Automated Checkpoint • Today</p>
            </div>
          </div>

          <div className="flex gap-6 relative">
            <div className="w-2 h-2 rounded-full bg-[#0A1931]/10 mt-1.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#0A1931] dark:text-white">Industrial Level 4 Certified</p>
              <p className="text-[10px] text-[#0A1931] dark:text-white/40 font-bold uppercase mt-0.5">Compliance Board • Mar 2024</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
