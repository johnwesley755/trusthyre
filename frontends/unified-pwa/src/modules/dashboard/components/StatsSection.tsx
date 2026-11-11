import React from 'react';
import { CheckCircle2, MapPin, Wallet, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ReactNode;
  containerColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, suffix, icon, containerColor }) => (
  <div className="bg-white dark:bg-[#09090B] p-5 rounded-2xl flex items-center justify-between shadow-xs border border-slate-200 dark:border-zinc-800/80 hover:border-blue-200 hover:shadow-md transition-all group">
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        {value}
        {suffix && <span className="text-xs font-semibold text-slate-400 ml-1">{suffix}</span>}
      </h3>
    </div>
    <div className={`w-12 h-12 rounded-xl ${containerColor} flex items-center justify-center transition-transform group-hover:scale-105 duration-300`}>
      {icon}
    </div>
  </div>
);

export const StatsSection: React.FC<{ trustScore?: number; nearbyJobs?: number; earnings?: string; completedJobs?: number; completedShifts?: number }> = ({ 
  nearbyJobs = 0, 
  earnings = "₹0",
  completedJobs = 0,
  completedShifts
}) => {
  const jobsCount = completedJobs || completedShifts || 0;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <StatCard 
        label="Completed Jobs"
        value={jobsCount}
        icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
        containerColor="bg-emerald-50 border border-emerald-100"
      />
      <StatCard 
        label="Open Jobs Near You"
        value={nearbyJobs}
        icon={<MapPin className="w-6 h-6 text-[#0066FF]" />}
        containerColor="bg-blue-50 border border-blue-100"
      />
      <StatCard 
        label="Wallet & Available Balance"
        value={earnings}
        icon={<Wallet className="w-6 h-6 text-indigo-600" />}
        containerColor="bg-indigo-50 border border-indigo-100"
      />
    </div>
  );
};

