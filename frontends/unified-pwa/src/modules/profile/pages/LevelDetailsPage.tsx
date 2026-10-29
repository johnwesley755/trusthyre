import { useQuery } from '@tanstack/react-query';
import { levelService } from '../../../services/level.service';
import { useUser } from '../../../providers/AuthContext';
import { 
  Star, 
  ShieldCheck, 
  Briefcase, 
  Award, 
  ArrowUpRight, 
  Info,
  ChevronLeft,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLoader } from '../../../components/common/AppLoader';

export const LevelDetailsPage = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: details, isLoading } = useQuery({
    queryKey: ['levelDetails', user?.id],
    queryFn: () => levelService.getLevelDetails(user?.id || ''),
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-screen p-4 bg-white font-['Onest',system-ui,sans-serif] flex items-center justify-center">
        <AppLoader variant="page" message="Loading your verified standing..." />
      </div>
    );
  }

  const currentLevel = details?.currentLevel || 'L1';
  const levelScore = details?.levelScore || 100;
  const nextLevel = details?.nextLevel || 'L2';

  const componentMetrics = [
    { 
      label: 'Verified Trade Skills', 
      score: details?.components?.skillScore || 80, 
      max: 100,
      icon: <Award className="w-5 h-5 text-[#0f2f63]" />,
      desc: 'Based on proctored technical evaluations'
    },
    { 
      label: 'Verified Work Experience', 
      score: details?.components?.experienceScore || 85, 
      max: 100,
      icon: <Briefcase className="w-5 h-5 text-emerald-600" />,
      desc: 'Logged and verified workplace shifts'
    },
    { 
      label: 'Employer Ratings', 
      score: details?.components?.performanceScore || 90, 
      max: 100,
      icon: <Star className="w-5 h-5 text-amber-500" />,
      desc: 'Supervisor check-out feedback and ratings'
    },
    { 
      label: 'Reliability Index', 
      score: details?.components?.reliabilityScore || 95, 
      max: 100,
      icon: <ShieldCheck className="w-5 h-5 text-[#0f2f63]" />,
      desc: 'Punctuality and attendance record'
    },
  ];

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <main className="max-w-6xl mx-auto space-y-6 pb-20">
        
        {/* Navigation Bar */}
        <div className="pt-2">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] text-xs font-medium transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Profile</span>
          </button>
        </div>

        {/* 1. Header Hero Card */}
        <div className="bg-[#f4f4f4] rounded-[2rem] p-6 sm:p-8 border border-[#e6e8ec]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0f2f63]" />
                <span className="text-[10px] font-semibold uppercase text-[#0f2f63]">
                  Verified Professional Standing
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a]">
                Trade Level {currentLevel} Specialist
              </h1>
              <p className="text-xs text-[#717784] font-medium leading-relaxed max-w-xl">
                Official credential tier on TrustHyre based on document verification, skill assessments, and completed shifts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white px-4 py-2 rounded-2xl border border-[#e6e8ec] shadow-2xs text-center">
                <span className="block text-[10px] font-semibold uppercase text-[#717784]">Total Score</span>
                <span className="text-base sm:text-lg font-bold text-[#0a0a0a] tabular-nums tracking-tight">
                  {levelScore} <span className="text-xs font-normal text-[#717784]">PTS</span>
                </span>
              </div>
              <div className="bg-[#0f2f63] text-white px-4 py-2 rounded-2xl shadow-xs text-center">
                <span className="block text-[10px] font-semibold uppercase text-white/70">Current Tier</span>
                <span className="text-base sm:text-lg font-bold tabular-nums">
                  {currentLevel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Component Performance Grid */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase text-[#717784] px-1">
            Certification Performance Breakdown
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {componentMetrics.map((comp, idx) => (
              <div 
                key={idx}
                className="bg-white p-5 rounded-2xl border border-[#e6e8ec] shadow-2xs space-y-3 hover:border-[#0f2f63]/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f4f4f4] border border-[#e6e8ec] flex items-center justify-center shrink-0">
                      {comp.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0a0a0a]">{comp.label}</h3>
                      <p className="text-[11px] text-[#717784] mt-0.5">{comp.desc}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-[#0a0a0a] tabular-nums tracking-tight">
                    {comp.score}
                    <span className="text-xs font-normal text-[#717784]">/{comp.max}</span>
                  </span>
                </div>

                <div className="w-full bg-[#f4f4f4] rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-[#0f2f63] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (comp.score / comp.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Progression to Next Level Card */}
        <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e6e8ec] pb-3">
            <ArrowUpRight className="w-4 h-4 text-[#0f2f63]" />
            <h3 className="text-xs font-bold uppercase text-[#717784]">
              Progression to Level {nextLevel}
            </h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e6e8ec] space-y-3">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-[#0f2f63] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#0a0a0a]">Expected Earnings Range</h4>
                <p className="text-xs text-[#717784] mt-0.5 leading-relaxed">
                  Advancing to Level {nextLevel} qualifies your profile for senior contracts with typical monthly compensation of{' '}
                  <strong className="text-emerald-700 font-bold tabular-nums">
                    {details?.salaryRange || '₹30,000 - ₹45,000 / month'}
                  </strong>.
                </p>
              </div>
            </div>

            {details?.achievements && details.achievements.length > 0 && (
              <div className="pt-3 border-t border-[#e6e8ec] space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#717784]">Earned Milestones</span>
                <div className="flex flex-wrap gap-2">
                  {details.achievements.map((ach: string, i: number) => (
                    <span 
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] text-xs font-semibold text-[#0a0a0a]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{ach}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};
