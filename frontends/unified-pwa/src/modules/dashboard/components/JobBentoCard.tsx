import React from 'react';

interface Job {
  id: string;
  title: string;
  location: string;
  budget: number;
  industry?: string;
  description?: string;
  imageUrl?: string;
  type?: string;
  schedule?: string;
  isApplied?: boolean;
}

export const JobBentoCard: React.FC<{ job: Job; onApply?: () => void; onClick?: () => void }> = ({ job, onApply, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 p-5 rounded-[24px] relative overflow-hidden bento-card shadow-sm hover:shadow-md transition-all border border-[#c1c8c3]/10 h-full flex flex-col cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="bg-[#F8FAFC] dark:bg-[#121215] px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-tighter text-[#0A1931] dark:text-white">
          {job.industry || 'General'}
        </div>
        <button className="material-symbols-outlined text-[#414845] dark:text-zinc-400/40 hover:text-[#ba1a1a] transition-colors cursor-pointer">
          favorite
        </button>
      </div>
      <h4 className="text-lg font-extrabold mb-1 text-[#0A1931] dark:text-white">{job.title}</h4>
      <p className="text-xs font-bold text-[#414845] dark:text-zinc-400 mb-4 flex items-center gap-1">
        <span className="material-symbols-outlined text-sm">location_on</span>
        {job.location}
      </p>
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="text-[#0A1931] dark:text-white">
          <span className="text-lg font-extrabold">₹{job.budget?.toLocaleString()}</span>
          <span className="text-[0.65rem] font-bold uppercase ml-1">/ day</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (!job.isApplied && onApply) onApply();
          }}
          disabled={job.isApplied}
          className={`${
            job.isApplied 
            ? 'bg-[#c1c8c3]/20 text-[#414845] dark:text-zinc-400/60 cursor-default border border-[#c1c8c3]/30' 
            : 'bg-[#FACD15] text-[#002117] hover:shadow-lg active:shadow-none active:translate-y-[1px]'
          } text-[0.65rem] font-extrabold px-4 py-2 rounded-xl uppercase transition-all flex items-center gap-2`}
        >
          {job.isApplied ? (
            <>
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Applied
            </>
          ) : 'Apply Now'}
        </button>
      </div>
    </div>
  );
};

export const FeaturedJobCard: React.FC<{ job: Job; onApply?: () => void; onClick?: () => void }> = ({ job, onApply, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 p-5 rounded-[24px] col-span-1 md:col-span-2 bento-card flex flex-col sm:flex-row gap-6 items-center shadow-sm hover:shadow-md transition-all border border-[#c1c8c3]/10 cursor-pointer"
    >
      <div className="h-24 w-24 rounded-2xl overflow-hidden flex-shrink-0 relative shadow-inner">
        <img 
          className="w-full h-full object-cover" 
          alt="Job illustration" 
          src={job.imageUrl || "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?q=80&w=200&auto=format&fit=crop"} 
        />
        <div className="absolute inset-0 bg-[#FACD15]/10 animate-pulse"></div>
      </div>
      <div className="flex-1 w-full">
        <div className="flex justify-between items-start mb-1">
          <h4 className="text-lg font-extrabold text-[#0A1931] dark:text-white">{job.title}</h4>
          <div className="bg-[#d1fae5] px-3 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-tighter text-[#2d4d41]">
            {job.type || 'Full Time'}
          </div>
        </div>
        <p className="text-xs text-[#414845] dark:text-zinc-400 mb-4 font-medium leading-relaxed italic">
          {job.description || "Exciting opportunity to join a growing team. Immediate joining required for qualified candidates."}
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[#414845] dark:text-zinc-400">schedule</span>
              <span className="text-[0.65rem] font-bold text-[#414845] dark:text-zinc-400">{job.schedule || '9 AM - 6 PM'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-[#414845] dark:text-zinc-400">currency_rupee</span>
              <span className="text-[0.65rem] font-bold text-[#414845] dark:text-zinc-400">₹{job.budget?.toLocaleString()}/mo</span>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!job.isApplied && onApply) onApply();
            }}
            disabled={job.isApplied}
            className={`${
              job.isApplied 
              ? 'bg-[#c1c8c3]/20 text-[#414845] dark:text-zinc-400/60 cursor-default border border-[#c1c8c3]/30' 
              : 'bg-[#FACD15] text-[#002117] hover:shadow-lg active:shadow-none active:translate-y-[1px]'
            } w-full sm:w-auto text-[0.65rem] font-extrabold px-6 py-2 rounded-xl uppercase transition-all flex items-center justify-center gap-2`}
          >
            {job.isApplied ? (
              <>
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Applied
              </>
            ) : 'Apply Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
