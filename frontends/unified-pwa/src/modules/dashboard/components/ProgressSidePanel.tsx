import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Award, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  containerColor: string;
  path: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, description, icon, containerColor, path }) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(path)}
      className="bg-white dark:bg-[#09090B] p-4 rounded-2xl flex items-center gap-3.5 cursor-pointer group shadow-xs hover:shadow-md transition-all border border-slate-200 dark:border-zinc-800/80 hover:border-blue-300"
    >
      <div className={`w-11 h-11 ${containerColor} rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate">{title}</h5>
        <p className="text-xs text-slate-500 font-medium truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#0066FF] transition-all shrink-0" />
    </div>
  );
};

interface ProgressSidePanelProps {
  level?: string;
  progress?: number;
}

export const ProgressSidePanel: React.FC<ProgressSidePanelProps> = ({ progress = 70 }) => {
  return (
    <div className="space-y-5">
      {/* Level Progress Card */}
      <div className="bg-gradient-to-br from-[#0A1931] to-[#0066FF] text-white p-6 rounded-3xl relative overflow-hidden shadow-lg shadow-blue-950/20 border border-blue-500/20">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" /> Verified Profile
            </span>
            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">Top 5%</span>
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="text-xl font-extrabold text-white tracking-tight">Profile Strength</h3>
              <span className="text-lg font-black text-amber-300">{progress}%</span>
            </div>
            <p className="text-xs text-blue-100/70 font-medium">Complete verification to boost your hiring chances</p>
          </div>

          <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full shadow-[0_0_12px_rgba(250,205,21,0.5)] transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest">To reach 100%:</p>
            <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-slate-100">Complete Identity verification</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-xl text-xs">
              <Circle className="w-4 h-4 text-blue-300 shrink-0" />
              <span className="font-medium text-slate-100">Receive 3 positive reviews</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">Quick Partner Actions</h4>
        <div className="space-y-2.5">
          <ActionCard 
            title="Complete Identity Verification" 
            description="Unlock direct bank withdrawals" 
            icon={<ShieldCheck className="w-5 h-5 text-[#0066FF]" />} 
            containerColor="bg-blue-50"
            path="/verify-identity"
          />
        </div>
      </div>
    </div>
  );
};
